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
const toArg = (value) => ({ type: value === null ? 'null' : Number.isInteger(value) ? 'integer' : typeof value === 'number' ? 'float' : 'text', value: String(value) });
const toBlob = (value) => ({ type: 'text', value });

async function runCron(env) {
  const TURSO_URL = (env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
  const TURSO_TOKEN = env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    console.error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing in Cloudflare env');
    return;
  }

  const query = async (statements) => {
    const response = await fetch(`${TURSO_URL}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          ...statements.map((statement) => ({
            type: 'execute',
            stmt: statement.args
              ? { sql: statement.sql, args: statement.args.map((arg) => toBlob(arg)) }
              : { sql: statement.sql },
          })),
          { type: 'close' },
        ],
      }),
    });
    
    const data = await response.json();
    if (!response.ok || data?.results?.some((result) => result.error)) {
      throw new Error(data?.results?.find((result) => result.error)?.error || data?.error || 'Turso query failed');
    }
    return data;
  };

  const readRows = (result) => (result?.response?.result?.rows || []).map((row) => row.map(parse));

  try {
    const ordersRes = await query([{ sql: 'SELECT data FROM orders ORDER BY id DESC' }]);
    const allOrders = readRows(ordersRes.results[0]).map(([data]) => parse(data));

    const settingsRes = await query([{ sql: 'SELECT key, value FROM settings' }]);
    const dbSettings = Object.fromEntries(readRows(settingsRes.results[0]).map(([key, value]) => [key, parse(value)]));

    const returnTime = dbSettings?.returnTime || '16.00';
    const [retHour, retMin] = returnTime.replace('.', ':').split(':').map(Number);
    const now = new Date();

    const toRestore = allOrders.filter(o => o.stockDeducted && !o.stockRestored && o.status !== 'Dibatalkan' && o.rentalDate);

    for (const order of toRestore) {
      const datePart = order.rentalDate.split('T')[0];
      const deadline = new Date(`${datePart}T${String(retHour).padStart(2, '0')}:${String(retMin).padStart(2, '0')}:00+07:00`);

      if (now >= deadline) {
        if (order.productId && order.variantId) {
          const productRes = await query([{ sql: 'SELECT data FROM catalog WHERE id = ?', args: [order.productId] }]);
          const currentProduct = readRows(productRes.results[0])[0]?.[0];
          if (currentProduct) {
            const product = parse(currentProduct);
            const variant = product.variants?.find((entry) => entry.id === order.variantId);
            if (variant) {
              variant.stock = Math.max(0, (variant.stock || 0) + 1);
              await query([{ sql: 'UPDATE catalog SET data = ? WHERE id = ?', args: [json(product), order.productId] }]);
            }
          }
        }
        
        const updatedOrder = { ...order, stockRestored: true, status: 'Selesai', restoredAt: new Date().toISOString() };
        await query([{ sql: 'INSERT INTO orders (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', args: [order.id, json(updatedOrder)] }]);
        console.log(`Restored stock for order #${order.id}`);
      }
    }

    // Auto-delete pending orders older than 1 hour
    const pendingOrders = allOrders.filter(o => o.status === 'Pending' && o.createdAt);
    const oneHourMs = 60 * 60 * 1000;

    for (const order of pendingOrders) {
      const created = new Date(order.createdAt).getTime();
      if (now.getTime() - created > oneHourMs) {
        await query([{ sql: 'DELETE FROM orders WHERE id = ?', args: [order.id] }]);
        console.log(`Auto-deleted expired pending order #${order.id}`);
      }
    }
  } catch (error) {
    console.error('Cron error:', error);
  }
}
