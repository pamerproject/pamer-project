/**
 * Sticker collection for animated emoji/GIF stickers.
 * Uses GIPHY media CDN which supports direct embedding/hotlinking.
 * Format: https://media.giphy.com/media/{ID}/giphy.gif
 */

export interface Sticker {
  id: string;
  name: string;
  url: string;
  category: string;
}

// GIPHY media CDN — no proxy needed, designed for embedding
const GIPHY = "https://media.giphy.com/media";

export const STICKERS: Sticker[] = [
  // ── Reactions / Emotions ──
  { id: "s1",  name: "Party",     url: `${GIPHY}/kcYxelkfOS23cdzYHl/giphy.gif`, category: "reactions" },
  { id: "s2",  name: "Fire",      url: `${GIPHY}/VrlySJX0k4SBABiWkI/giphy.gif`, category: "reactions" },
  { id: "s3",  name: "Heart Eyes",url: `${GIPHY}/1xo9E5hDY7PMRGto9L/giphy.gif`, category: "reactions" },
  { id: "s4",  name: "Cry",       url: `${GIPHY}/0eMumU6VJ01GPh9MI0/giphy.gif`, category: "reactions" },
  { id: "s5",  name: "LOL",       url: `${GIPHY}/s4P7sIitfUbJtl61v5/giphy.gif`, category: "reactions" },
  { id: "s6",  name: "Clap",      url: `${GIPHY}/Z9uERnzkW098ezsfMu/giphy.gif`, category: "reactions" },
  { id: "s7",  name: "Wave",      url: `${GIPHY}/O1zckCYfJm17YUtLwW/giphy.gif`, category: "reactions" },
  { id: "s8",  name: "100",       url: `${GIPHY}/Aid9HZCALf0xE9a3RB/giphy.gif`, category: "reactions" },
  { id: "s9",  name: "Pog",       url: `${GIPHY}/PpmaByA926me8X4Fw2/giphy.gif`, category: "reactions" },
  { id: "s10", name: "Sadge",     url: `${GIPHY}/Vgsur2BZdGigIJapjk/giphy.gif`, category: "reactions" },

  // ── Celebration ──
  { id: "s11", name: "Tada",      url: `${GIPHY}/d3MKUPmuO1fyPaRq/giphy.gif`, category: "celebration" },
  { id: "s12", name: "Confetti",  url: `${GIPHY}/d3MKUPmuO1fyPaRq/giphy.gif`, category: "celebration" },
  { id: "s13", name: "Cool",      url: `${GIPHY}/IXr7ArSuxzvmIDTCPN/giphy.gif`, category: "celebration" },
  { id: "s14", name: "Hype",      url: `${GIPHY}/74rH4kt5OhpmsD0tno/giphy.gif`, category: "celebration" },
  { id: "s15", name: "GG",        url: `${GIPHY}/R1IUKGGzZIpL5kMFgE/giphy.gif`, category: "celebration" },

  // ── Love ──
  { id: "s16", name: "Love",      url: `${GIPHY}/1vU5JUaG9PdaavRUul/giphy.gif`, category: "love" },
  { id: "s17", name: "Kiss",      url: `${GIPHY}/h5eLsAvbbr4awWP8Eu/giphy.gif`, category: "love" },
  { id: "s18", name: "Hug",       url: `${GIPHY}/W4VnyuwTh1ScaZPoxM/giphy.gif`, category: "love" },
  { id: "s19", name: "Blush",     url: `${GIPHY}/wNk71OcVtOPncxNHVT/giphy.gif`, category: "love" },

  // ── Funny / Meme ──
  { id: "s20", name: "Pepe",      url: `${GIPHY}/ICaZHFYrDIbkWdGJeJ/giphy.gif`, category: "funny" },
  { id: "s21", name: "MonkaS",    url: `${GIPHY}/9p3tJ8mY03yf4IAPb1/giphy.gif`, category: "funny" },
  { id: "s22", name: "Smug",      url: `${GIPHY}/qMwsx8aOipRDEPDpg5/giphy.gif`, category: "funny" },
  { id: "s23", name: "Wink",      url: `${GIPHY}/nPDZOKwayysKuYp9ks/giphy.gif`, category: "funny" },

  // ── Tech ──
  { id: "s24", name: "Coding",    url: `${GIPHY}/SHjOSDkKZ18qOHA5B5/giphy.gif`, category: "tech" },
  { id: "s25", name: "Bug",       url: `${GIPHY}/96YynFYTFu2VCg9IBU/giphy.gif`, category: "tech" },
  { id: "s26", name: "Deploy",    url: `${GIPHY}/llSGhUSKnJRZ0WffJi/giphy.gif`, category: "tech" },
  { id: "s27", name: "Ship It",   url: `${GIPHY}/ujYxbenfg80vWGRpDG/giphy.gif`, category: "tech" },
];

export const STICKER_CATEGORIES = [
  { id: "reactions", label: "😊 Reactions" },
  { id: "celebration", label: "🎉 Celebration" },
  { id: "love", label: "❤️ Love" },
  { id: "funny", label: "😂 Funny" },
  { id: "tech", label: "💻 Tech" },
];

/** Check if a URL points to an image that can be rendered inline */
export function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  // Standard image file extensions
  if (/\.(gif|png|jpe?g|webp|svg|bmp)$/i.test(clean)) return true;
  return false;
}
