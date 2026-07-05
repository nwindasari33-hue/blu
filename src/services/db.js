const API_ENDPOINT = '/api/db';

const callApi = async (action, payload = {}) => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Database request failed');
  }

  return data;
};

export const initDB = async () => {
  await callApi('init');
  return true;
};

export const getCatalog = async () => callApi('getCatalog');
export const saveCatalogItem = async (item) => callApi('saveCatalogItem', { item });
export const deleteCatalogItem = async (id) => callApi('deleteCatalogItem', { id });
export const getOrders = async () => callApi('getOrders');
export const saveOrder = async (order) => callApi('saveOrder', { order });
export const deleteOrder = async (id) => callApi('deleteOrder', { id });
export const adjustVariantStock = async (productId, variantId, delta) =>
  callApi('adjustVariantStock', { productId, variantId, delta });
export const getFonts = async () => callApi('getFonts');
export const saveFont = async (font) => callApi('saveFont', { font });
export const deleteFont = async (id) => callApi('deleteFont', { id });

export const injectFontFace = (name, base64Data) => {
  const styleId = `font-style-${name}`;
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @font-face {
      font-family: '${name}';
      src: url('${base64Data}') format('truetype');
      font-display: swap;
    }
  `;
};

export const loadAndInjectAllFonts = async () => {
  try {
    const fonts = await getFonts();
    fonts.forEach((font) => injectFontFace(font.name, font.data));
  } catch (error) {
    console.error('Failed to load and inject saved fonts:', error);
  }
};

export const getSettings = async () => callApi('getSettings');
export const saveSettingItem = async (key, value) => callApi('saveSettingItem', { key, value });
export const saveSettings = async (settings) => callApi('saveSettings', { settings });
export const useVoucher = async (code) => callApi('useVoucher', { code });
export const getBlogs = async () => callApi('getBlogs');
export const saveBlog = async (blog) => callApi('saveBlog', { blog });
export const deleteBlog = async (id) => callApi('deleteBlog', { id });
export const incrementBlogViews = async (id) => callApi('incrementBlogViews', { id });
