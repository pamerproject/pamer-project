import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Migrasi URL gambar lama dari domain R2 yang DIBLOKIR internetpositif/
// TrustPositif (pub-*.r2.dev, dan fallback endpoint S3 r2.cloudflarestorage.com)
// ke custom domain (mis. https://media.pamerproject.com) yang sudah dilampirkan
// ke bucket di Cloudflare → R2 → Settings → Custom Domains.
//
// Pakai SQL REPLACE sederhana: prefix URL diganti apa adanya di kolom teks,
// termasuk di dalam JSON Post.image (imgs: [...]).
//
// Usage:
//   node scripts/migrate-r2-domain.mjs --dry-run          # preview, tanpa tulis
//   node scripts/migrate-r2-domain.mjs --to https://media.pamerproject.com
//   node scripts/migrate-r2-domain.mjs                     # pakai R2_PUBLIC_URL di .env

const sql = neon(process.env.DATABASE_URL);

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const OLD_DEV_DOMAIN = "https://pub-f4c9c6989a1b49aabec5a73b7a433dd1.r2.dev";
const OLD_S3_FALLBACK = "https://4c41ab1db088006757fafa9abc80ab70.r2.cloudflarestorage.com/pamerproject";
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

// (table, column) yang menyimpan URL gambar hasil upload R2
const TARGETS = [
  ["User", "avatar"],
  ["User", "coverImage"],
  ["Project", "image"],
  ["Post", "image"],
  ["Comment", "ogImage"],
  ["Job", "image"],
  ["Event", "image"],
  ["SeoSettings", "ogImage"],
  ["SeoSettings", "favicon"],
];

console.log("Migrasi URL gambar R2:");
console.log(`  dari : ${from}`);
console.log(`  ke   : ${to}`);
console.log(`  mode : ${dryRun ? "DRY-RUN (tidak menulis)" : "tulis ke DB"}`);
console.log("");

const oldPrefixes = [from];
if (from === OLD_DEV_DOMAIN) oldPrefixes.push(OLD_S3_FALLBACK);

let total = 0;

for (const [table, col] of TARGETS) {
  for (const old of oldPrefixes) {
    const like = `%${old}%`;
    const countRes = await sql.query(
      `SELECT count(*)::int AS n FROM "${table}" WHERE "${col}" LIKE $1`,
      [like]
    );
    const found = countRes[0]?.n || 0;
    if (found === 0) continue;

    if (dryRun) {
      console.log(`  [dry-run] ${table}.${col}: ${found} baris akan diubah (${old})`);
      total += found;
      continue;
    }

    const res = await sql.query(
      `UPDATE "${table}"
       SET "${col}" = REPLACE("${col}", $1, $2)
       WHERE "${col}" LIKE $3`,
      [old, to, like]
    );
    const updated = res?.rowCount ?? found;
    console.log(`  ${table}.${col}: ${updated} baris diubah (${old})`);
    total += updated;
  }
}

console.log("");
console.log(`Total ${dryRun ? "AKAN diubah" : "diubah"}: ${total} baris`);
