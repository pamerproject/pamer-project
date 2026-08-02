import "dotenv/config";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

// Migrasi URL gambar lama dari domain R2 dev (pub-*.r2.dev) yang diblokir
// internetpositif/TrustPositif di Indonesia, ke custom domain (mis.
// https://media.pamerproject.com) yang dilampirkan ke bucket di Cloudflare.
//
// Domain lama default diambil dari pemakaian sebelumnya. Bisa diganti dengan
// flag --from, dan target baru dengan --to atau R2_PUBLIC_URL di .env.
//
// Usage:
//   node scripts/migrate-r2-domain.mjs --dry-run
//   node scripts/migrate-r2-domain.mjs --to https://media.pamerproject.com
//   node scripts/migrate-r2-domain.mjs  # pakai R2_PUBLIC_URL dari .env

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const OLD_DEV_DOMAIN = "https://pub-f4c9c6989a1b49aabec5a73b7a433dd1.r2.dev";
const from = (argOf("--from") || OLD_DEV_DOMAIN).replace(/\/+$/, "");
const to = (argOf("--to") || process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
const dryRun = args.includes("--dry-run");

if (!to) {
  console.error(
    "❌ Target domain belum ada. Set R2_PUBLIC_URL di .env atau pakai --to https://media.pamerproject.com"
  );
  process.exit(1);
}

if (!to.startsWith("https://") && !to.startsWith("http://")) {
  console.error(`❌ --to harus berupa URL lengkap (mis. https://media.pamerproject.com). Diterima: ${to}`);
  process.exit(1);
}

console.log(`Migrasi URL gambar:`);
console.log(`  dari : ${from}`);
console.log(`  ke   : ${to}`);
console.log(`  mode : ${dryRun ? "DRY-RUN (tidak menulis)" : "tulis ke DB"}`);
console.log("");

function rewriteUrl(url) {
  if (typeof url !== "string" || !url) return url;
  if (!url.startsWith(from)) return url;
  return to + url.slice(from.length);
}

function rewritePostImage(raw) {
  if (typeof raw !== "string" || !raw) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map(rewriteUrl));
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.imgs)) {
      return JSON.stringify({ ...parsed, imgs: parsed.imgs.map(rewriteUrl) });
    }
    return raw;
  } catch {
    return raw;
  }
}

// model + field yang menyimpan URL gambar hasil upload R2
const CONFIG = [
  { model: "user", fields: ["avatar", "coverImage"] },
  { model: "project", fields: ["image"] },
  { model: "post", fields: ["image"], json: true },
  { model: "comment", fields: ["ogImage"] },
  { model: "job", fields: ["image"] },
  { model: "event", fields: ["image"] },
  { model: "seoSettings", fields: ["ogImage", "favicon"] },
];

let total = 0;

for (const { model, fields, json } of CONFIG) {
  for (const field of fields) {
    const rows = await prisma[model].findMany({
      where: { [field]: { contains: from } },
      select: { id: true, [field]: true },
    });

    let changed = 0;
    for (const row of rows) {
      const next = json ? rewritePostImage(row[field]) : rewriteUrl(row[field]);
      if (next === row[field]) continue;
      changed++;
      total++;
      if (!dryRun) {
        await prisma[model].update({ where: { id: row.id }, data: { [field]: next } });
      } else {
        console.log(`  [dry-run] ${model}.${field} → ${row.id}`);
      }
    }

    console.log(`${model}.${field}: ${rows.length} ditemukan, ${changed} akan diubah`);
  }
}

console.log("");
console.log(`Total ${dryRun ? "AKAN diubah" : "diubah"}: ${total} baris`);
await prisma.$disconnect();
