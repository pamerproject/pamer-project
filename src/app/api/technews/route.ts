import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

interface TechNewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: "devto" | "hackernews" | "lokal";
  sourceName: string;
  publishedAt: string;
  tags: string[];
  author: string | null;
  score?: number;
}

interface RssItemWithMedia {
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  pubDate?: string;
  enclosure?: { url?: string };
  content?: string;
  mediaContent?: { $?: { url?: string } } | { $?: { url?: string } }[];
  mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
}

interface HackerNewsItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  type?: string;
  time?: number;
  by?: string;
  score?: number;
}

interface DevToArticle {
  id?: number;
  title?: string;
  description?: string;
  url?: string;
  username?: string;
  slug?: string;
  cover_image?: string | null;
  social_image?: string | null;
  published_at?: string;
  created_at?: string;
  tag_list?: string[];
  user?: { name?: string };
  positive_reactions_count?: number;
}

// ─── RSS Sources (Indonesia) ──────────────────────────

const RSS_SOURCES = [
  { name: "DetikInet", url: "https://rss.detik.com/index.php/detikinet" },
  { name: "CNN Indonesia Tekno", url: "https://www.cnnindonesia.com/teknologi/rss" },
  { name: "Antara Tekno", url: "https://www.antaranews.com/rss/tekno.xml" },
];

function extractRssImage(item: RssItemWithMedia): string | null {
  // Try enclosure (standard RSS media)
  if (item.enclosure?.url) return item.enclosure.url;

  // Try media:content / media:thumbnail from custom fields
  const mc = item.mediaContent;
  if (mc) {
    const url = Array.isArray(mc) ? mc[0]?.$?.url : mc?.$?.url;
    if (typeof url === "string") return url;
  }
  const mt = item.mediaThumbnail;
  if (mt) {
    const url = Array.isArray(mt) ? mt[0]?.$?.url : mt?.$?.url;
    if (typeof url === "string") return url;
  }

  // Try content HTML for <img> tag
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
  }

  return null;
}

async function fetchRssFeeds(): Promise<TechNewsItem[]> {
  try {
    const promises = RSS_SOURCES.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        return (feed.items || []).slice(0, 5).map((item) => ({
          id: `${source.name.toLowerCase().replace(/\s/g, "")}-${item.guid || item.link || Math.random().toString(36).slice(2)}`,
          title: item.title?.trim() || "",
          description: item.contentSnippet?.trim()?.slice(0, 300) || item.title?.trim() || "",
          url: item.link || "",
          image: extractRssImage(item),
          source: "lokal" as const,
          sourceName: source.name,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          tags: [],
          author: null,
        }));
      } catch {
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat().sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch {
    return [];
  }
}

// ─── Hacker News ───────────────────────────────────────

async function fetchHackerNews(page: number): Promise<TechNewsItem[]> {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const ids: number[] = await res.json();
    const start = (page - 1) * 12;
    const topIds = ids.slice(start, start + 12);

    const stories: (HackerNewsItem | null)[] = await Promise.all(
      topIds.map(async (id) => {
        try {
          const detail = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            { next: { revalidate: 300 } }
          );
          if (!detail.ok) return null;
          return (await detail.json()) as HackerNewsItem;
        } catch {
          return null;
        }
      })
    );

    return stories
      .filter((s): s is HackerNewsItem => !!s && s.type === "story" && !!s.title && !!s.url)
      .map((s) => ({
        id: `hn-${s.id}`,
        title: s.title || "",
        description: s.text || s.title || "",
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        image: null,
        source: "hackernews" as const,
        sourceName: "Hacker News",
        publishedAt: new Date((s.time || 0) * 1000).toISOString(),
        tags: s.title ? extractTags(s.title) : [],
        author: s.by || null,
        score: s.score || 0,
      }));
  } catch {
    return [];
  }
}

// ─── Dev.to ────────────────────────────────────────────

async function fetchDevTo(page: number): Promise<TechNewsItem[]> {
  try {
    const res = await fetch(
      `https://dev.to/api/articles?tag=technology&per_page=12&page=${page}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const articles: DevToArticle[] = await res.json();

    return articles.map((a) => ({
      id: `devto-${a.id}`,
      title: a.title || "",
      description: a.description || a.title || "",
      url: a.url || `https://dev.to/${a.username}/${a.slug}`,
      image: a.cover_image || a.social_image || null,
      source: "devto" as const,
      sourceName: "Dev.to",
      publishedAt: a.published_at || a.created_at || new Date().toISOString(),
      tags: (a.tag_list || []).slice(0, 5),
      author: a.user?.name || a.username || null,
      score: a.positive_reactions_count || 0,
    }));
  } catch {
    return [];
  }
}

// ─── Helper ────────────────────────────────────────────

function extractTags(text: string): string[] {
  const common = [
    "ai", "ml", "web", "app", "startup", "security", "data",
    "cloud", "dev", "code", "linux", "python", "js", "rust",
    "google", "apple", "meta", "microsoft", "openai", "gpt",
  ];
  const lower = text.toLowerCase();
  return common.filter((t) => lower.includes(t)).slice(0, 3);
}

// ─── GET ────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);

    const fetchLokal = url.searchParams.get("lokal") !== "false";

    const [devto, hackernews, lokal] = await Promise.all([
      fetchDevTo(page),
      fetchHackerNews(page),
      fetchLokal ? fetchRssFeeds() : Promise.resolve([]),
    ]);

    return NextResponse.json({ devto, hackernews, lokal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
