export default async function handler(req, res) {
  const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const API_ENDPOINT = `${protocol}://${host}/api/db`;

  const callApi = async (action, payload = {}) => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    return response.json();
  };

  try {
    const [allOrders, dbSettings] = await Promise.all([
      callApi('getOrders'),
      callApi('getSettings')
    ]);

    const returnTime = dbSettings?.returnTime || '16.00';
    const [retHour, retMin] = returnTime.replace('.', ':').split(':').map(Number);
    const now = new Date();

    const toRestore = (allOrders || []).filter(o =>
      o.stockDeducted && !o.stockRestored &&
      o.status !== 'Dibatalkan' &&
      o.rentalDate
    );

    for (const order of toRestore) {
      const acara = new Date(order.rentalDate);
      const deadline = new Date(acara);
      deadline.setHours(retHour, retMin ?? 0, 0, 0);

      if (now >= deadline) {
        if (order.productId && order.variantId) {
          await callApi('adjustVariantStock', { productId: order.productId, variantId: order.variantId, delta: +1 });
        }
        await callApi('saveOrder', { order: { ...order, stockRestored: true, status: 'Selesai', restoredAt: new Date().toISOString() } });
      }
    }
    return res.status(200).json({ success: true, restored: toRestore.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
