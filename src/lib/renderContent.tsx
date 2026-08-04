import React from "react";
import Image from "next/image";
import CodeBlock from "@/components/ui/CodeBlock";
import LinkWithPreview from "@/components/ui/LinkWithPreview";
import { isImageUrl } from "@/lib/stickers";

/**
 * Parse text content and render:
 * - Code blocks (```language ... ```) → SyntaxHighlighted CodeBlock with copy button
 * - Inline code (`code`) → Styled inline code
 * - URLs (https://... or www.xxx...) → Clickable link (biru + underline)
 * - @mentions → Link to user profile
 * - Basic HTML (<b>, <i>, <u>, <s>) → Rendered as formatted text
 * - Newlines → Line breaks
 * - Regular text → As-is
 */

/** Safe inline HTML tag name to React element mapping */
const INLINE_TAG_MAP: Record<string, keyof React.JSX.IntrinsicElements> = {
  b: "strong",
  strong: "strong",
  i: "em",
  em: "em",
  u: "u",
  s: "s",
  del: "del",
  code: "code",
};

const SAFE_TAGS = Object.keys(INLINE_TAG_MAP);
const SAFE_TAG_PATTERN = SAFE_TAGS.join("|");

/**
 * Parse safe inline HTML tags (<b>, <i>, <strong>, <em>, <u>, <s>, <del>, <code>, <br>)
 * into React elements. Supports nesting: <b>bold <i>and italic</i></b>
 */
function renderInlineHtml(text: string): React.ReactNode[] {
  if (!text || (!text.includes("<") && !text.includes(">"))) return [text];

  const tagRe = new RegExp(
    `<(${SAFE_TAG_PATTERN})(?:\\s[^>]*)?>|<\\/(${SAFE_TAG_PATTERN})>|<br\\s*\\/?>`,
    "gi"
  );

  const stack: Array<{ tag: string; children: React.ReactNode[] }> = [
    { tag: "", children: [] },
  ];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(text)) !== null) {
    // Text before this tag
    if (match.index > lastIndex) {
      stack[stack.length - 1].children.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0].toLowerCase();
    const openTag = match[1]?.toLowerCase();
    const closeTag = match[2]?.toLowerCase();
    const isBr = /^<br\s*\/?>$/.test(fullMatch);

    if (isBr) {
      stack[stack.length - 1].children.push(<br />);
    } else if (openTag && SAFE_TAGS.includes(openTag)) {
      stack.push({ tag: openTag, children: [] });
    } else if (closeTag && SAFE_TAGS.includes(closeTag)) {
      if (stack.length > 1 && stack[stack.length - 1].tag === closeTag) {
        const frame = stack.pop()!;
        const element = React.createElement(
          INLINE_TAG_MAP[frame.tag] || frame.tag,
          { key: `html-${match.index}` },
          frame.children.length > 0 ? frame.children : undefined
        );
        stack[stack.length - 1].children.push(element);
      } else {
        stack[stack.length - 1].children.push(fullMatch);
      }
    } else {
      stack[stack.length - 1].children.push(fullMatch);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    stack[stack.length - 1].children.push(text.slice(lastIndex));
  }

  // Flatten any remaining unclosed tags
  while (stack.length > 1) {
    const frame = stack.pop()!;
    const element = React.createElement(
      INLINE_TAG_MAP[frame.tag] || frame.tag,
      { key: `unclosed-${stack.length}` },
      frame.children.length > 0 ? frame.children : undefined
    );
    stack[stack.length - 1].children.push(element);
  }

  return stack[0].children;
}

/**
 * Process an array of ReactNode, converting newlines (\n) to <br />
 * in any string parts.
 */
function processLineBreaks(nodes: React.ReactNode[]): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  for (const node of nodes) {
    if (typeof node !== "string") {
      result.push(node);
    } else if (!node.includes("\n")) {
      result.push(node);
    } else {
      const parts = node.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) result.push(<br key={`lb-${result.length}`} />);
        result.push(parts[i]);
      }
    }
  }
  return result;
}

function splitCodeBlocks(text: string): React.ReactNode[] {
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const lang = match[1] || "";
    const code = match[2].replace(/\n$/, ""); // Remove trailing newline

    parts.push(
      <CodeBlock key={`code-${match.index}`} code={code} language={lang} />
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderInlineCode(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <code
        key={`ic-${match.index}`}
        className="rounded-md bg-[var(--brand-light)] px-1.5 py-0.5 text-[0.85em] font-mono font-medium text-[var(--brand)]"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function renderYouTubeEmbeds(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|m\.youtube\.com)\/[^\s<]+[^\s<.,;:!?)'>\]"])/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ytRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const url = match[0];
    const videoId = extractYouTubeId(url);

    if (videoId) {
      parts.push(
        <div
          key={`yt-${match.index}`}
          className="relative w-full max-w-full overflow-hidden rounded-xl my-2"
          style={{ aspectRatio: "16/9", maxHeight: 500, maxWidth: "100%" }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      );
    } else {
      parts.push(url);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Process an array of ReactNode, rendering YouTube embeds in any string parts */
function renderYouTubeOnNodes(parts: React.ReactNode[]): React.ReactNode[] {
  return parts.flatMap((part) => {
    if (typeof part !== "string") return [part];
    return renderYouTubeEmbeds(part);
  });
}

function renderUrls(text: string, withPreview = false): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match: https://..., www.xxx..., or bare domains like google.com, sub.example.com/path
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?)'>\]"])|(www\.[^\s<]+[^\s<.,;:!?)'>\]"])|((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s<]*[^\s<.,;:!?)\]"'>])?)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const url = match[0];
    let href = url;
    // Tambah https:// untuk www. links atau bare domain
    if (url.startsWith("www.")) {
      href = "https://" + url;
    } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
      href = "https://" + url;
    }

    // Jika URL adalah gambar (.gif, .png, .jpg, .webp), render sebagai inline Image (unoptimized)
    if (isImageUrl(href)) {
      const isSticker = href.includes("giphy.com");
      parts.push(
        <span key={`img-${match.index}`} className="mx-0.5 inline-block max-w-full align-middle">
          <div className="relative inline-block">
            {/* unoptimized: URL bisa .gif animasi (giphy) & dimensi intrinsik tak diketahui */}
            <Image
              src={href}
              alt=""
              width={640}
              height={400}
              unoptimized
              className={`max-h-64 w-auto max-w-full rounded-xl object-contain transition-all ${
                isSticker ? "" : "cursor-pointer hover:shadow-md"
              }`}
              onClick={isSticker ? undefined : (e: React.MouseEvent<HTMLImageElement>) => {
                e.stopPropagation();
                window.open(href, "_blank", "noopener,noreferrer");
              }}
            />
            {isSticker && (
              <div className="pointer-events-none absolute bottom-1 right-1.5 select-none">
                <span className="text-[9px] font-medium tracking-wide text-white/40">
                  giphy.com
                </span>
              </div>
            )}
          </div>
        </span>
      );
    } else if (withPreview) {
      parts.push(
        <LinkWithPreview
          key={`url-${match.index}`}
          url={url}
          href={href}
          className="cursor-pointer break-all font-medium text-blue-600 underline decoration-blue-600/30 hover:decoration-blue-600 transition-all"
        />
      );
    } else {
      parts.push(
        <span
          key={`url-${match.index}`}
          className="cursor-pointer break-all font-medium text-blue-600 underline decoration-blue-600/30 hover:decoration-blue-600 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            window.open(href, "_blank", "noopener,noreferrer");
          }}
        >
          {url}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Process an array of ReactNode, rendering URLs in any string parts */
function renderUrlsOnNodes(parts: React.ReactNode[], withPreview = false): React.ReactNode[] {
  return parts.flatMap((part) => {
    if (typeof part !== "string") return [part];
    return renderUrls(part, withPreview);
  });
}

/**
 * Resolve teks setelah '@' menjadi (username, nama tampilan, sisa teks).
 * - Cari nama TERPANJANG di nameToUsername yang cocok sebagai awalan raw
 *   (case-insensitive, dengan batas kata), jadi "@Ketut Dana gimana" tetap
 *   resolve ke nama penuh "Ketut Dana" → username "ketutdana", sisa " gimana"
 *   di-render sebagai teks biasa (tidak ikut ter-link).
 * - Fallback: anggap kata pertama sebagai username (cth: ketik @joko manual).
 */
export function resolveMention(
  raw: string,
  nameToUsername?: Map<string, string>
): { name: string; username: string; leftover: string } {
  if (nameToUsername) {
    const lower = raw.toLowerCase();
    let bestName = "";
    let bestUsername = "";
    for (const [name, username] of nameToUsername.entries()) {
      const nameLower = name.toLowerCase();
      if (lower === nameLower || lower.startsWith(nameLower + " ")) {
        if (name.length > bestName.length) {
          bestName = name;
          bestUsername = username;
        }
      }
    }
    if (bestName) {
      return {
        name: bestName,
        username: bestUsername,
        leftover: raw.slice(bestName.length),
      };
    }
  }
  const firstWord = raw.split(/[ \t]+/)[0];
  return {
    name: firstWord,
    username: firstWord.toLowerCase(),
    leftover: raw.slice(firstWord.length),
  };
}

function renderMentions(
  parts: React.ReactNode[],
  mentionMap?: Map<string, string>,
  nameToUsername?: Map<string, string>
): React.ReactNode[] {
  return parts.map((part, i) => {
    if (typeof part !== "string") return part;

    // @ diikuti 1+ kata — dukung nama multi-kata (cth: "@Joko Widodo").
    // Tanda baca (koma, titik, seru, dst) sengaja TIDAK dimasukkan ke token,
    // jadi "@Joko, apa kabar" tetap ter-link ke /u/joko (koma jadi teks biasa).
    const segments = part.split(/(@[^\s@.,;:!?()\[\]"'<>]+(?:[ \t]+[^\s@.,;:!?()\[\]"'<>]+)*)/g);
    if (segments.length === 1) return part;

    return (
      <React.Fragment key={`m-${i}`}>
        {segments.map((seg, j) => {
          if (seg.startsWith("@") && seg.length > 1) {
            // Pisahkan tanda baca di akhir mention (koma, titik, seru, dst) dari nama
            // agar tidak ikut ter-link (cth: "@Joko," → link ke /u/joko, bukan /u/Joko,)
            const trailingPunctMatch = seg.match(/[,.!?;:)\]"'>]+$/);
            const body = trailingPunctMatch
              ? seg.slice(0, seg.length - trailingPunctMatch[0].length)
              : seg;
            const trailing = trailingPunctMatch ? trailingPunctMatch[0] : "";

            const raw = body.slice(1);
            const resolved = resolveMention(raw, nameToUsername);
            const leftover = resolved.leftover + trailing;
            const displayName = mentionMap?.get(resolved.username) || resolved.name;
            const isAll = resolved.username.toLowerCase() === "all";
            return (
              <React.Fragment key={j}>
                <span
                  className={`cursor-pointer font-semibold hover:underline ${
                    isAll
                      ? "rounded bg-yellow-100 px-1 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "text-[var(--brand)]"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAll) window.location.href = `/u/${resolved.username}`;
                  }}
                >
                  @{displayName}
                </span>
                {leftover}
              </React.Fragment>
            );
          }
          return seg;
        })}
      </React.Fragment>
    );
  });
}

/**
 * Main render function for post content, descriptions, and comments.
 * Detects code blocks, inline code, YouTube embeds, URLs (with optional OG preview),
 * @mentions, basic HTML formatting (<b>, <i>, <u>, <s>, <br>), and newlines.
 *
 * @param showLinkPreview - Jika true, URL akan render LinkWithPreview dengan OG card (gambar + meta).
 *                         Jika false, URL hanya render sebagai blue clickable link.
 *                         Gunakan false untuk komentar karena CommentOgPreview sudah handle OG card.
 * @param mentionMap - Map<username, displayName> untuk menampilkan nama asli @mention di chat.
 * @param nameToUsername - Map<name, username> agar @nama (bukan @username) tetap bisa di-link ke /u/username.
 */
export default function renderContent(
  text: string,
  showLinkPreview = true,
  mentionMap?: Map<string, string>,
  nameToUsername?: Map<string, string>
): React.ReactNode {
  if (!text) return null;

  // Step 1: Split by code blocks (``` ... ```)
  const afterCodeBlocks = splitCodeBlocks(text);

  // Step 2: Process each non-code-block part
  //   a. Basic HTML formatting (<b>, <i>, etc.) → React elements
  //   b. Pipeline: inline code → YouTube embeds → URLs → mentions
  const processed = afterCodeBlocks.map((part) => {
    if (typeof part !== "string") return part;
    // Step 2a: Parse basic HTML formatting
    const withHtml = renderInlineHtml(part);
    // Step 2b: Pipeline inline code → YouTube → URLs → mentions
    return withHtml.map((node) => {
      if (typeof node !== "string") return node;
      const withInlineCode = renderInlineCode(node);
      const withYoutube = renderYouTubeOnNodes(withInlineCode);
      const withUrls = renderUrlsOnNodes(withYoutube, showLinkPreview);
      return renderMentions(withUrls, mentionMap, nameToUsername);
    });
  });

  // Step 3: Flatten and process line breaks
  const withBreaks = processLineBreaks(processed.flat());

  return <>{withBreaks}</>;
}
