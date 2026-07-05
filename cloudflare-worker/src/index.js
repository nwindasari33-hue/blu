export default {
  async scheduled(event, env, ctx) {
    await runCron(env);
  },
  // Endpoint fetch manual jika ingin tes dari browser (opsional)
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/cron') {
      await runCron(env);
      return new Response("Cron executed");
    }
    return new Response("Not Found", { status: 404 });
  }
};

const json = (value) => JSON.stringify(value ?? null);
const parse = (value) => { try { return JSON.parse(value); } catch { return value; } };

async function runCron(env) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL or SUPABASE_KEY missing in Cloudflare env');
    return;
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    // 1. Fetch Orders
    const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=data`, { headers });
    if (!ordersRes.ok) throw new Error('Failed to fetch orders');
    const ordersData = await ordersRes.json();
    const allOrders = ordersData.map(row => parse(row.data));

    // 2. Fetch Settings
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, { headers });
    if (!settingsRes.ok) throw new Error('Failed to fetch settings');
    const settingsData = await settingsRes.json();
    const dbSettings = Object.fromEntries(settingsData.map(row => [row.key, parse(row.value)]));

    const returnTime = dbSettings?.returnTime || '16.00';
    const [retHour, retMin] = returnTime.replace('.', ':').split(':').map(Number);
    const now = new Date();

    // 3. Restore Stock for Expired Rentals
    const toRestore = allOrders.filter(o => o.stockDeducted && !o.stockRestored && o.status !== 'Dibatalkan' && o.rentalDate);

    for (const order of toRestore) {
      const datePart = order.rentalDate.split('T')[0];
      const deadline = new Date(`${datePart}T${String(retHour).padStart(2, '0')}:${String(retMin).padStart(2, '0')}:00+07:00`);

      if (now >= deadline) {
        if (order.productId && order.variantId) {
          // Fetch product
          const productRes = await fetch(`${SUPABASE_URL}/rest/v1/catalog?id=eq.${order.productId}&select=data`, { headers });
          if (productRes.ok) {
            const productRows = await productRes.json();
            if (productRows.length > 0) {
              const product = parse(productRows[0].data);
              const variant = product.variants?.find((entry) => entry.id === order.variantId);
              if (variant) {
                variant.stock = Math.max(0, (variant.stock || 0) + 1);
                
                // Update catalog
                await fetch(`${SUPABASE_URL}/rest/v1/catalog?id=eq.${order.productId}`, {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify({ data: json(product) })
                });
              }
            }
          }
        }
        
        // Mark order as completed and stock restored
        const updatedOrder = { ...order, stockRestored: true, status: 'Selesai', restoredAt: new Date().toISOString() };
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ data: json(updatedOrder) })
        });
        console.log(`Restored stock for order #${order.id}`);
      }
    }

    // 4. Auto-delete pending orders older than 1 hour
    const pendingOrders = allOrders.filter(o => o.status === 'Pending' && o.createdAt);
    const oneHourMs = 60 * 60 * 1000;

    for (const order of pendingOrders) {
      const created = new Date(order.createdAt).getTime();
      if (now.getTime() - created > oneHourMs) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
          method: 'DELETE',
          headers
        });
        console.log(`Auto-deleted expired pending order #${order.id}`);
      }
    }
  } catch (error) {
    console.error('Cron error:', error);
  }
}
