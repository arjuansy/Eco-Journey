# Eco-Journey Ticket

## Menyiapkan Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**, jalankan `backend/database/schema.sql`, lalu jalankan `backend/database/seed.sql`.
3. Di **Storage**, buat bucket private bernama `payment-proofs`.
4. Salin `.env.example` menjadi `.env`, lalu isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `JWT_SECRET` dari project Anda. `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan backend; jangan pernah menaruhnya di frontend atau membagikannya.
5. Untuk memberikan akses Admin, daftarkan akun melalui halaman Daftar, lalu jalankan query berikut di SQL Editor dengan email akun Anda:

   ```sql
   UPDATE public.users SET role = 'ADMIN' WHERE email = 'email-admin-anda@example.com';
   ```

6. Jalankan `npm install`, lalu `npm start`. Periksa koneksi melalui `http://localhost:3000/api/health`.

Backend memakai Supabase untuk data aplikasi dan Supabase Storage untuk bukti pembayaran. Tabel memakai Row Level Security; akses tabel dilakukan oleh Express melalui service role key yang disimpan di server.

## Deploy ke Vercel

1. Import repository ini sebagai project Vercel dan atur **Root Directory** ke root repository (`.`), yaitu folder yang memuat `package.json`, `vercel.json`, dan `index.js`.
2. Pastikan **Build Command** adalah `npm run build` dan **Output Directory** adalah `public` (sudah ditetapkan pada `vercel.json`). Root Directory harus folder project yang berisi `package.json`, `vercel.json`, dan `index.js`.
3. Tambahkan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, dan `SUPABASE_STORAGE_BUCKET` di **Project Settings → Environment Variables**. Jangan masukkan service-role key ke frontend.
4. Jalankan deploy. Build menyalin frontend ke `public/frontend` agar aset disajikan dari CDN; Express diekspor dari `index.js` sebagai API.
5. Buka `/api/health` pada domain deployment dan pastikan respons berstatus `ok`. Pastikan bucket Storage `payment-proofs` tersedia dan private.

Secara lokal, API tetap menggunakan `http://localhost:3000/api`. Pada deployment, frontend memakai `/api` pada domain yang sama sehingga tidak bergantung pada `localhost` pengunjung.
