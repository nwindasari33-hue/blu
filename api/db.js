import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Gunakan anon key dari env atau fallback ke string yang diberikan user
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eijduhejrzpucwgfhcve.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpamR1aGVqcnpwdWN3Z2ZoY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjMxMjksImV4cCI6MjA5ODgzOTEyOX0.9F5vl5vp6Ec20hELZkSebUrfRmhqQXEjhGVCEgsdNNw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const json = (value) => JSON.stringify(value ?? null);
const parse = (value) => {
  try { return JSON.parse(value); } catch { return value; }
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { action } = body;

    if (action === 'init') {
      return res.status(200).json({ ok: true });
    }

    // ==========================================
    // CATALOG
    // ==========================================
    if (action === 'getCatalog') {
      const { data, error } = await supabase.from('catalog').select('data').order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data.map((row) => parse(row.data)));
    }
    if (action === 'saveCatalogItem') {
      const { item } = body;
      const { error } = await supabase.from('catalog').upsert({ id: String(item.id), data: json(item) });
      if (error) throw error;
      return res.status(200).json(item);
    }
    if (action === 'deleteCatalogItem') {
      const { error } = await supabase.from('catalog').delete().eq('id', String(body.id));
      if (error) throw error;
      return res.status(200).json({ id: body.id });
    }
    if (action === 'adjustVariantStock') {
      const { data: currentData, error: fetchError } = await supabase.from('catalog').select('data').eq('id', String(body.productId)).maybeSingle();
      if (fetchError) throw fetchError;
      if (!currentData) return res.status(404).json({ error: 'Product not found' });
      
      const product = parse(currentData.data);
      const variant = product.variants?.find((entry) => String(entry.id) === String(body.variantId));
      if (!variant) return res.status(404).json({ error: 'Variant not found' });
      
      variant.stock = Math.max(0, (variant.stock || 0) + Number(body.delta || 0));
      const { error: updateError } = await supabase.from('catalog').update({ data: json(product) }).eq('id', String(body.productId));
      if (updateError) throw updateError;
      return res.status(200).json(product);
    }

    // ==========================================
    // ORDERS
    // ==========================================
    if (action === 'getOrders') {
      const { data, error } = await supabase.from('orders').select('data').order('id', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data.map((row) => parse(row.data)));
    }
    if (action === 'saveOrder') {
      const { order } = body;
      const { error } = await supabase.from('orders').upsert({ id: String(order.id), data: json(order) });
      if (error) throw error;
      return res.status(200).json(order);
    }
    if (action === 'deleteOrder') {
      const { error } = await supabase.from('orders').delete().eq('id', String(body.id));
      if (error) throw error;
      return res.status(200).json({ id: body.id });
    }

    // ==========================================
    // FONTS
    // ==========================================
    if (action === 'getFonts') {
      const { data, error } = await supabase.from('fonts').select('data').order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data.map((row) => parse(row.data)));
    }
    if (action === 'saveFont') {
      const { font } = body;
      const { error } = await supabase.from('fonts').upsert({ id: String(font.id), data: json(font) });
      if (error) throw error;
      return res.status(200).json(font);
    }
    if (action === 'deleteFont') {
      const { error } = await supabase.from('fonts').delete().eq('id', String(body.id));
      if (error) throw error;
      return res.status(200).json({ id: body.id });
    }

    // ==========================================
    // SETTINGS
    // ==========================================
    if (action === 'getSettings') {
      const { data, error } = await supabase.from('settings').select('key, value');
      if (error) throw error;
      return res.status(200).json(Object.fromEntries(data.map((row) => [row.key, parse(row.value)])));
    }
    if (action === 'saveSettingItem') {
      const { error } = await supabase.from('settings').upsert({ key: String(body.key), value: json(body.value) });
      if (error) throw error;
      return res.status(200).json({ key: body.key, value: body.value });
    }
    if (action === 'saveSettings') {
      const { settings } = body;
      if (!settings || Object.keys(settings).length === 0) {
        return res.status(400).json({ error: 'Settings object is empty' });
      }
      
      const upserts = Object.entries(settings).map(([key, value]) => ({
        key: String(key),
        value: json(value)
      }));
      
      const { error } = await supabase.from('settings').upsert(upserts);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
    if (action === 'useVoucher') {
      const { data, error: fetchError } = await supabase.from('settings').select('value').eq('key', 'vouchers').maybeSingle();
      const vouchers = data ? parse(data.value) : [];
      let updated = false;
      const next = vouchers.map((voucher) => {
        if (voucher.code?.toUpperCase() === body.code?.toUpperCase() && voucher.quota > 0) {
          updated = true;
          return { ...voucher, quota: voucher.quota - 1 };
        }
        return voucher;
      });
      if (updated) {
        const { error: updateError } = await supabase.from('settings').upsert({ key: 'vouchers', value: json(next) });
        if (updateError) throw updateError;
      }
      return res.status(200).json({ updated });
    }

    // ==========================================
    // BLOGS
    // ==========================================
    if (action === 'getBlogs') {
      const { data, error } = await supabase.from('blogs').select('data').order('id', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data.map((row) => parse(row.data)));
    }
    if (action === 'saveBlog') {
      const { blog } = body;
      const { error } = await supabase.from('blogs').upsert({ id: String(blog.id), data: json(blog) });
      if (error) throw error;
      return res.status(200).json(blog);
    }
    if (action === 'deleteBlog') {
      const { error } = await supabase.from('blogs').delete().eq('id', String(body.id));
      if (error) throw error;
      return res.status(200).json({ id: body.id });
    }
    if (action === 'incrementBlogViews') {
      const { data: currentData, error: fetchError } = await supabase.from('blogs').select('data').eq('id', String(body.id)).maybeSingle();
      if (fetchError || !currentData) return res.status(200).json({ views: 0 });
      
      const blog = parse(currentData.data);
      blog.views = (blog.views || 0) + 1;
      
      const { error: updateError } = await supabase.from('blogs').update({ data: json(blog) }).eq('id', String(body.id));
      if (updateError) throw updateError;
      return res.status(200).json({ views: blog.views });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('Supabase Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
