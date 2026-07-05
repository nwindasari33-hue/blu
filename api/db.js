import { initialCatalog } from '../src/data/initialCatalog.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const TURSO_URL = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const defaultSettings = [
  { key: 'adminUsername', value: 'admin' },
  { key: 'adminPassword', value: 'admin123' },
  { key: 'shops', value: [
    { id: 1, name: 'Toko Utama', address: 'Jl. Malioboro No. 12, Gedong Tengen, Kota Yogyakarta', lat: -7.792480, lng: 110.365655 },
    { id: 2, name: 'Toko Cabang', address: 'Jl. Kaliurang Km. 5, Sleman, DI Yogyakarta', lat: -7.762690, lng: 110.381690 },
  ]},
  { key: 'shippingBaseFee', value: 5000 },
  { key: 'shippingRatePerKm', value: 3000 },
  { key: 'shippingZones', value: [
    { id: 'zone-1', name: 'Dalam Kota', radiusStart: 0, radiusEnd: 5, type: 'per_km', rate: 2000 },
    { id: 'zone-2', name: 'Pinggiran Kota', radiusStart: 5, radiusEnd: 15, type: 'per_km', rate: 4000 },
    { id: 'zone-3', name: 'Luar Kota', radiusStart: 15, radiusEnd: 999, type: 'per_km', rate: 6000 },
  ]},
  { key: 'shippingAreas', value: [
    { id: 'area-1', name: 'Bondowoso', keyword: 'Bondowoso', flatRate: 5000 },
  ]},
  { key: 'shopName', value: 'AcrilyGrad' },
  { key: 'waNumber', value: '6281234567890' },
  { key: 'availableSizes', value: 'A1 (59.4 x 84.1 cm), A2 (42 x 59.4 cm), A3 (29.7 x 42 cm)' },
  { key: 'storePolicy', value: 'Papan harus dikembalikan maksimal pukul 16.00 WIB di hari yang sama.' },
  { key: 'storeHours', value: 'Senin - Sabtu: 08.00 - 17.00 WIB' },
  { key: 'tomtomApiKey', value: 'ZGivQglmFeXV1B9a4ZcWOrkcikjY3HqD' },
  { key: 'footerTagline', value: 'Hadirkan momen wisuda yang tak terlupakan dengan sentuhan elegan.' },
  { key: 'footerTrustBadge1', value: '500+ Wisudawan Puas' },
  { key: 'footerTrustBadge2', value: 'Pengiriman Tepat Waktu' },
  { key: 'footerTrustBadge3', value: 'Kualitas Premium Terjamin' },
  { key: 'footerInstagram', value: '' },
  { key: 'footerTiktok', value: '' },
  { key: 'footerFacebook', value: '' },
  { key: 'footerCopyright', value: '© 2025 AcrilyGrad. Semua hak dilindungi.' },
];

const json = (value) => JSON.stringify(value ?? null);
const parse = (value) => {
  try { return JSON.parse(value); } catch { return value; }
};
const toArg = (value) => ({ type: value === null ? 'null' : Number.isInteger(value) ? 'integer' : typeof value === 'number' ? 'float' : 'text', value: String(value) });
const toBlob = (value) => ({ type: 'text', value });

const query = async (statements) => {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN wajib di-set');
  }

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

const init = async () => {
  await query([
    { sql: 'CREATE TABLE IF NOT EXISTS catalog (id TEXT PRIMARY KEY, data TEXT NOT NULL)' },
    { sql: 'CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT NOT NULL)' },
    { sql: 'CREATE TABLE IF NOT EXISTS fonts (id TEXT PRIMARY KEY, data TEXT NOT NULL)' },
    { sql: 'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)' },
    { sql: 'CREATE TABLE IF NOT EXISTS blogs (id TEXT PRIMARY KEY, data TEXT NOT NULL)' },
    ...initialCatalog.map((item) => ({ sql: 'INSERT OR IGNORE INTO catalog (id, data) VALUES (?, ?)', args: [item.id, json(item)] })),
    ...defaultSettings.map((item) => ({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: [item.key, json(item.value)] })),
  ]);
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action } = body;

    if (action === 'init') {
      await init();
      return res.status(200).json({ ok: true });
    }

    if (action === 'getCatalog') {
      const result = await query([{ sql: 'SELECT data FROM catalog ORDER BY id' }]);
      return res.status(200).json(readRows(result.results[0]).map(([data]) => parse(data)));
    }
    if (action === 'saveCatalogItem') {
      const { item } = body;
      await query([{ sql: 'INSERT INTO catalog (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', args: [item.id, json(item)] }]);
      return res.status(200).json(item);
    }
    if (action === 'deleteCatalogItem') {
      await query([{ sql: 'DELETE FROM catalog WHERE id = ?', args: [body.id] }]);
      return res.status(200).json({ id: body.id });
    }

    if (action === 'getOrders') {
      const result = await query([{ sql: 'SELECT data FROM orders ORDER BY id DESC' }]);
      return res.status(200).json(readRows(result.results[0]).map(([data]) => parse(data)));
    }
    if (action === 'saveOrder') {
      const { order } = body;
      await query([{ sql: 'INSERT INTO orders (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', args: [order.id, json(order)] }]);
      return res.status(200).json(order);
    }
    if (action === 'deleteOrder') {
      await query([{ sql: 'DELETE FROM orders WHERE id = ?', args: [body.id] }]);
      return res.status(200).json({ id: body.id });
    }
    if (action === 'adjustVariantStock') {
      const result = await query([{ sql: 'SELECT data FROM catalog WHERE id = ?', args: [body.productId] }]);
      const current = readRows(result.results[0])[0]?.[0];
      if (!current) return res.status(404).json({ error: 'Product not found' });
      const product = parse(current);
      const variant = product.variants?.find((entry) => entry.id === body.variantId);
      if (!variant) return res.status(404).json({ error: 'Variant not found' });
      variant.stock = Math.max(0, (variant.stock || 0) + Number(body.delta || 0));
      await query([{ sql: 'UPDATE catalog SET data = ? WHERE id = ?', args: [json(product), body.productId] }]);
      return res.status(200).json(product);
    }

    if (action === 'getFonts') {
      const result = await query([{ sql: 'SELECT data FROM fonts ORDER BY id' }]);
      return res.status(200).json(readRows(result.results[0]).map(([data]) => parse(data)));
    }
    if (action === 'saveFont') {
      const { font } = body;
      await query([{ sql: 'INSERT INTO fonts (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', args: [font.id, json(font)] }]);
      return res.status(200).json(font);
    }
    if (action === 'deleteFont') {
      await query([{ sql: 'DELETE FROM fonts WHERE id = ?', args: [body.id] }]);
      return res.status(200).json({ id: body.id });
    }

    if (action === 'getSettings') {
      const result = await query([{ sql: 'SELECT key, value FROM settings' }]);
      return res.status(200).json(Object.fromEntries(readRows(result.results[0]).map(([key, value]) => [key, parse(value)])));
    }
    if (action === 'saveSettingItem') {
      await query([{ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [body.key, json(body.value)] }]);
      return res.status(200).json({ key: body.key, value: body.value });
    }
    if (action === 'useVoucher') {
      const result = await query([{ sql: 'SELECT value FROM settings WHERE key = ?', args: ['vouchers'] }]);
      const current = readRows(result.results[0])[0]?.[0];
      const vouchers = current ? parse(current) : [];
      let updated = false;
      const next = vouchers.map((voucher) => {
        if (voucher.code?.toUpperCase() === body.code?.toUpperCase() && voucher.quota > 0) {
          updated = true;
          return { ...voucher, quota: voucher.quota - 1 };
        }
        return voucher;
      });
      if (updated) {
        await query([{ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: ['vouchers', json(next)] }]);
      }
      return res.status(200).json({ updated });
    }

    if (action === 'getBlogs') {
      const result = await query([{ sql: 'SELECT data FROM blogs ORDER BY id DESC' }]);
      return res.status(200).json(readRows(result.results[0]).map(([data]) => parse(data)));
    }
    if (action === 'saveBlog') {
      const { blog } = body;
      await query([{ sql: 'INSERT INTO blogs (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', args: [blog.id, json(blog)] }]);
      return res.status(200).json(blog);
    }
    if (action === 'deleteBlog') {
      await query([{ sql: 'DELETE FROM blogs WHERE id = ?', args: [body.id] }]);
      return res.status(200).json({ id: body.id });
    }
    if (action === 'incrementBlogViews') {
      const result = await query([{ sql: 'SELECT data FROM blogs WHERE id = ?', args: [body.id] }]);
      const current = readRows(result.results[0])[0]?.[0];
      if (!current) return res.status(200).json({ views: 0 });
      const blog = parse(current);
      blog.views = (blog.views || 0) + 1;
      await query([{ sql: 'UPDATE blogs SET data = ? WHERE id = ?', args: [json(blog), body.id] }]);
      return res.status(200).json({ views: blog.views });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
