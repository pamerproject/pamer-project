# PamerProject

Platform komunitas untuk developer Indonesia untuk **memamerkan project**, berbagi **postingan**, **lowongan kerja**, **event**, dan **freelance** dalam satu tempat. Dapat diakses di [pamerproject.com](https://pamerproject.com).

## Fitur

- **Project showcase** — publikasi project dengan detail, link, repo GitHub, screenshot, dan posisi gambar (top/center/bottom + zoom).
- **Postingan** — feed dengan gambar, link, komentar, like, dan sistem pin komentar oleh pemilik postingan.
- **Admin pin** — project/postingan yang disematkan (maks. 5) dengan kustomisasi urutan & badge.
- **Lowongan kerja** — daftar lowongan dari komunitas + agregasi otomatis dari sumber eksternal.
- **Event** — pembuatan & pendaftaran event dengan durasi terstruktur (hari/minggu/bulan).
- **Freelance & Tech News** — agregasi lowongan freelance dan berita teknologi dari RSS/HN/Dev.to.
- **Profil pengguna** — avatar/cover dengan kontrol posisi & zoom, bio, tautan sosial, statistik.
- **Autentikasi** — Email/password, Google OAuth, GitHub OAuth (NextAuth v4), verifikasi email, reset password.
- **i18n** — Bahasa Indonesia & English, pemilihan bahasa disimpan di `localStorage`.
- **Sensorship** — filter kata kasar otomatis (daftar di `src/lib/badwords.json`).
- **URL safety** — deteksi link mencurigakan (phishing, shortener, typosquatting) di sisi klien.
- **SEO** — pengaturan SEO dinamis dari dashboard admin (`SeoSettings`) + revalidate tag.
- **Halaman statis admin** — halaman About/Contact/Terms/Privacy yang dapat diedit dari dashboard.

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | React 19, Tailwind CSS v4, lucide-react, recharts |
| Database | PostgreSQL (Neon) via Prisma ORM 7 |
| Auth | NextAuth v4 (credentials + Google + GitHub) |
| Storage | Cloudflare R2 (gambar) |
| Cache / Rate-limit | Vercel KV |
| Email | Nodemailer (SMTP) |
| Testing | Vitest |

## Struktur Project

```
├── prisma/
│   └── schema.prisma          # 12 model: User, Project, Post, Comment, Like, ...
├── scripts/
│   ├── seed-admin.ts          # Seeder akun admin
│   ├── seed-giveaway.ts       # Seeder data giveaway/event contoh
│   └── clear-r2.mjs           # Hapus objek dari bucket R2
├── src/
│   ├── app/
│   │   ├── api/               # Route handler (posts, projects, jobs, events, ...)
│   │   ├── (auth)/            # login, register, verify-email, reset-password
│   │   ├── (dashboard)/       # dashboard pengguna (posts, projects, settings)
│   │   ├── dashboard/         # dashboard admin (SEO, pin, halaman, event)
│   │   └── u/ project/ post/ event/ ...
│   ├── components/            # Komponen UI (Feed, Sidebar, Modals, Editor, ...)
│   ├── lib/
│   │   ├── lang/              # Kamus i18n: id.ts & en.ts
│   │   ├── helpers.ts         # Utilitas: parsePostImage, getTimeAgo, translateApiError
│   │   ├── api-error.ts       # Helper respons error API konsisten
│   │   ├── censor.ts          # Filter kata kasar
│   │   ├── urlSafety.ts       # Deteksi URL mencurigakan
│   │   └── ...
│   └── generated/prisma/      # Prisma Client (di-generate, jangan diedit manual)
└── vitest.config.mts
```

## Prasyarat

- Node.js 20+
- PostgreSQL (disarankan [Neon](https://neon.tech)) — atau database PostgreSQL lain
- Akun Cloudflare R2, Vercel KV, dan kredensial OAuth (opsional untuk fitur tertentu)

## Setup Lokal

```bash
# 1. Install dependencies
npm install

# 2. Salin file environment
cp .env.example .env
# lalu isi nilai-nilainya (lihat komentar di .env.example)

# 3. Generate Prisma Client & buat tabel
npx prisma generate
npx prisma migrate dev --name init

# 4. (Opsional) Seed akun admin
npm run seed

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> **Catatan Prisma Client**: di project ini, Prisma Client di-generate ke `src/generated/prisma`
> (bukan `node_modules`), sehingga import dari `@/generated/prisma/client`. `npm install`
> otomatis menjalankan `prisma generate` lewat script `postinstall`.

## Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variabel utama:

| Variabel | Fungsi |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL (Neon) |
| `NEXTAUTH_SECRET` | Secret untuk NextAuth (generate: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Base URL (contoh `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth Google (callback: `/api/auth/callback/google`) |
| `GITHUB_CLIENT_ID/SECRET` | OAuth GitHub (callback: `/api/auth/callback/github`) |
| `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET/BUCKET_NAME/ENDPOINT/PUBLIC_URL` | Cloudflare R2 untuk upload gambar |
| `KV_REST_API_URL/TOKEN` | Vercel KV untuk rate-limit & cache |
| `SMTP_*` | Server email untuk verifikasi & reset password |
| `ADMIN_*` | Akun admin untuk seeder |

## Scripts

| Script | Deskripsi |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Menjalankan production build |
| `npm run lint` | ESLint |
| `npm test` | Menjalankan unit test (Vitest, sekali) |
| `npm run test:watch` | Menjalankan unit test (watch mode) |
| `npm run seed` | Seed akun admin (`prisma db seed`) |
| `npm run seed-admin` | Seed akun admin (via tsx) |
| `npm run seed-giveaway` | Seed data giveaway contoh |

## Testing

Unit test ditulis dengan **Vitest** dan berada di samping file sumber (`src/**/*.test.ts`).

```bash
npm test              # sekali
npm run test:watch    # watch mode
```

Test mencakup fungsi murni utama: `helpers.ts` (parsePostImage, getTimeAgo,
encode/decodePositionZoom, translateApiError), `censor.ts`, `eventDuration.ts`, dan
`urlSafety.ts`.

## i18n

- Kamus bahasa di `src/lib/lang/id.ts` dan `src/lib/lang/en.ts`.
- Preferensi bahasa disimpan di `localStorage` dengan key `pamerproject_lang`.
- **Pesan error API** memakai *translation key* (mis. `"auth.emailExists"`), bukan teks
  hardcoded. Klien meresolusi key tersebut lewat `translateApiError()` di
  `src/lib/helpers.ts`. Route lama yang masih mengirim teks Bahasa Indonesia tetap
  didukung lewat `LEGACY_API_ERROR_MAP`.

## Deployment

Aplikasi ini dirancang untuk di-deploy di **Vercel**:

1. Push repository ke GitHub dan import ke Vercel.
2. Isi semua environment variables (`.env.example`).
3. Jalankan migrasi database sebelum deploy pertama:
   ```bash
   npx prisma migrate deploy
   ```
4. Vercel menjalankan `npm run build` otomatis; `postinstall` men-generate Prisma Client.

Infrastruktur pendukung: **Neon** (PostgreSQL), **Cloudflare R2** (gambar), **Vercel KV**
(rate-limit/cache), dan **SMTP** untuk email.
