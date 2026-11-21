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
