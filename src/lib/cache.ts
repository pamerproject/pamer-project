export function cacheHeaders(ttlSeconds = 60): HeadersInit {
  return {
    "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 10}`,
  };
}

// Untuk respons yang SPESIFIK PER-USER (notifikasi, state like, komentar
// dengan isLiked, project dengan isLiked/visibility). Cache publik/CDN
// (mis. Cloudflare di depan Vercel) TIDAK BOLEH menyimpan data milik user
// lain — tanpa Vary: Cookie, header `public, s-maxage` akan membocorkan
// daftar notifikasi user B ke user A yang meminta URL yang sama.
export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "private, no-store",
  };
}
