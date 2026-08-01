# 🚀 DEPLOY-CHECKLIST — pamerkoding.com

Checklist ini dipakai setiap kali deploy ke **produksi** (Vercel + Neon PostgreSQL).

> ⚠️ `.env` lokal **tidak** memengaruhi Vercel. Semua nilai harus diset ulang di
> **Vercel → Project → Settings → Environment Variables** (jangan lupa centang
> "Available to Builds" untuk yang dibutuhkan saat build).

---

## 1. 🔴 Wajib sebelum deploy pertama (atau setiap ganti database)

| # | Langkah | Status |
|---|---|---|
| 1 | **Update `DATABASE_URL` di Vercel** — pakai koneksi **pooled** Neon (`...-pooler...`) | ☐ |
| 2 | **Tambahkan `DIRECT_URL` di Vercel** — koneksi **direct** Neon (tanpa `-pooler`) untuk migrasi | ☐ |
| 3 | **Jalankan migrasi ke DB produksi** sekali: `npx prisma migrate deploy` (pakai DIRECT_URL) | ☐ |
| 4 | **Seed akun admin** sekali: `npm run seed-admin` (butuh `ADMIN_EMAIL`/`ADMIN_PASSWORD` di env) | ☐ |
| 5 | Pastikan `NEXTAUTH_URL` = domain produksi (mis. `https://pamerkoding.com`) | ☐ |
| 6 | Pastikan `NEXTAUTH_SECRET` terisi (buat: `openssl rand -base64 32`) | ☐ |

## 2. 🔵 Env vars lengkap untuk Vercel

| Variabel | Contoh | Dipakai untuk |
|---|---|---|
| `DATABASE_URL` | `postgresql://...@...-pooler.c-3....neon.tech/neondb?sslmode=require` | Runtime (pooled) |
| `DIRECT_URL` | `postgresql://...@....c-3....neon.tech/neondb?sslmode=require` | Migrasi (direct) |
| `NEXTAUTH_URL` | `https://pamerkoding.com` | OAuth callback, link email |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Session JWT |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | dari Google Console | Login Google |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | dari GitHub OAuth Apps | Login GitHub |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | dari Cloudflare R2 | Upload gambar |
| `R2_BUCKET_NAME` / `R2_ENDPOINT` / `R2_PUBLIC_URL` | `pamerproject` dll. | Upload gambar |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | dari Vercel KV | Rate limit & cache |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | dari provider email | Kirim email verifikasi/reset |
| `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL` | `PamerProject` / `noreply@...` | Pengirim email |

## 3. 🟢 Sebelum deploy (kode)

- [ ] `npx tsc --noEmit` → 0 error
- [ ] `npm test` → semua lolos
- [ ] `npx next build` → sukses
- [ ] `npm audit` → 0 vulnerabilities
- [ ] Git status bersih dari file sensitif (`.env`, `*.local`)

## 4. 🟢 Setelah deploy

- [ ] Buka homepage, login, buat post, upload gambar (tes R2)
- [ ] Tes forgot-password (tes SMTP)
- [ ] Tes /dashboard admin (role ADMIN)
- [ ] Cek Vercel logs tidak ada error runtime

## 5. 🔁 Migrasi otomatis (opsional)

Sudah tersedia `.github/workflows/migrate.yml` — otomatis `prisma migrate deploy`
setiap push ke `main`. Syarat: tambahkan secret **`DIRECT_URL`** dan **`DATABASE_URL`**
di GitHub → Settings → Secrets and variables → Actions.

> `prisma migrate deploy` bersifat **idempotent** — hanya menerapkan migrasi yang
> belum dijalankan, tidak pernah menghapus data.
