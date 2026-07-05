# React + Vite

## Turso + Vercel

Aplikasi ini sekarang memakai Turso sebagai database dan endpoint serverless `api/db.js` untuk akses data.

### Environment variables

Set ini di Vercel dan di lokal kalau menjalankan fungsi serverless:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### Deploy ke Vercel Free

1. Push repo ke GitHub.
2. Import project ke Vercel.
3. Tambahkan dua environment variable di atas.
4. Deploy.

### Jalankan lokal

Supaya endpoint `/api/db` ikut jalan, pakai `vercel dev` setelah env Turso diset.
