import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kita baca data mock
import { initialCatalog } from '../src/data/initialCatalog.js';

const DOMAIN = 'https://acrilygrad.vercel.app'; // Ganti dengan domain asli nanti

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Products -->
${initialCatalog.map(product => `  <url>
    <loc>${DOMAIN}/product/${product.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/sitemap.xml'), sitemap, 'utf-8');
console.log('✅ sitemap.xml berhasil dibuat ulang dengan produk terbaru!');
