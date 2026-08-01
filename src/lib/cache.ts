export function cacheHeaders(ttlSeconds = 60): HeadersInit {
  return {
    "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 10}`,
  };
}
