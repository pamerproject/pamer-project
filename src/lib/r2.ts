import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";

const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const bucketName = (process.env.R2_BUCKET_NAME || "pamerproject").trim();
const endpoint =
  (process.env.R2_ENDPOINT ||
    `https://${accountId}.r2.cloudflarestorage.com`).trim();

const region = "auto";
const service = "s3";

let client: AwsClient | null = null;

function getClient(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service,
      region,
    });
  }
  return client;
}

export function isR2Configured(): boolean {
  return !!(accountId && accessKeyId && secretAccessKey && bucketName);
}

/**
 * Build the S3 API URL for a given key.
 */
function objectUrl(key: string): URL {
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  return new URL(`${base}/${bucketName}/${key}`);
}

/** Public base URL (no trailing slash) — used for returned URLs and key extraction. */
function publicBaseUrl(): string {
  const base = process.env.R2_PUBLIC_URL || `${endpoint}/${bucketName}`;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/**
 * Upload buffer ke Cloudflare R2.
 * Returns URL publik gambar yang sudah diupload.
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error(
      "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY di .env"
    );
  }

  const s3 = getClient();
  const url = objectUrl(key);

  const response = await s3.fetch(url.toString(), {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      // R2 mewajibkan Content-Length. aws4fetch tidak mengirimnya sendiri dan
      // terkadang runtime fetch (undici/Next.js) tidak menambahkannya untuk body
      // Uint8Array — akibatnya R2 menolak dengan 411 MissingContentLength.
      "Content-Length": String(buffer.byteLength),
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(
      `R2 upload failed (${response.status}): ${text.slice(0, 200)}`
    );
  }

  // Return public URL — if R2_PUBLIC_URL is set, use it; otherwise construct from endpoint
  return `${publicBaseUrl()}/${key}`;
}

/**
 * Hapus file dari R2 berdasarkan key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!isR2Configured()) return;

  const s3 = getClient();
  const url = objectUrl(key);

  const response = await s3.fetch(url.toString(), {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(
      `R2 delete failed (${response.status}): ${text.slice(0, 200)}`
    );
  }
}

/**
 * Generate key unik untuk file gambar di R2.
 * Format: posts/<uuid>.webp
 */
export function generateImageKey(): string {
  const uuid = randomUUID();
  return `posts/${uuid}.webp`;
}

export function generateFileKey(ext: string): string {
  const uuid = randomUUID();
  return `uploads/${uuid}.${ext}`;
}

/** Extract R2 key from a public URL. Returns null if the URL doesn't match R2. */
export function extractImageKey(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const publicBase = publicBaseUrl();
  if (publicUrl.startsWith(publicBase)) {
    const key = publicUrl.slice(publicBase.length + 1);
    return key || null;
  }
  return null;
}

/** Delete a single image from R2 by its public URL (no-op if not an R2 URL). */
export async function deleteImageByUrl(
  publicUrl: string | null | undefined
): Promise<void> {
  if (!publicUrl) return;
  const key = extractImageKey(publicUrl);
  if (!key) return;
  await deleteFromR2(key);
}

/** Parse Post.image JSON and return array of image URLs. */
export function parsePostImageUrls(image: string | null): string[] {
  if (!image) return [];
  try {
    const parsed = JSON.parse(image);
    if (Array.isArray(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.imgs)
    )
      return parsed.imgs;
  } catch {}
  return [image];
}

/** Delete all image URLs in a Post.image JSON field from R2. */
export async function deletePostImages(image: string | null): Promise<void> {
  const urls = parsePostImageUrls(image);
  await Promise.all(urls.map((url) => deleteImageByUrl(url)));
}
