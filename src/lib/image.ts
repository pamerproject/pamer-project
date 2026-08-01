import sharp from "sharp";

export type CompressionResult = {
  buffer: Buffer;
  sizeKB: number;
  width: number;
  height: number;
  quality: number;
  originalSizeKB: number;
  compressed: boolean;
};

export type CompressOptions = {
  maxSizeKB?: number;
  maxWidth?: number;
  quality?: number;
};

export async function compressImage(
  input: Buffer,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const { maxSizeKB = 64, maxWidth = 1920, quality: initialQuality = 85 } = options;

  const originalSizeKB = Math.round(input.length / 1024);
  let metadata = await sharp(input).metadata();
  let width = metadata.width || 0;
  let height = metadata.height || 0;

  if (input.length <= maxSizeKB * 1024) {
    return {
      buffer: input,
      sizeKB: originalSizeKB,
      width,
      height,
      quality: 100,
      originalSizeKB,
      compressed: false,
    };
  }

  let pipeline = sharp(input);

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
    pipeline = pipeline.resize(maxWidth);
  }

  let low = 10;
  let high = initialQuality;
  let bestBuffer = await pipeline.clone().webp({ quality: high }).toBuffer();
  let bestQuality = high;

  if (bestBuffer.length <= maxSizeKB * 1024) {
    metadata = await sharp(bestBuffer).metadata();
    return {
      buffer: bestBuffer,
      sizeKB: Math.round(bestBuffer.length / 1024),
      width: metadata.width || width,
      height: metadata.height || height,
      quality: bestQuality,
      originalSizeKB,
      compressed: bestBuffer.length < input.length,
    };
  }

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const buf = await pipeline.clone().webp({ quality: mid }).toBuffer();

    if (buf.length <= maxSizeKB * 1024) {
      bestBuffer = buf;
      bestQuality = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  metadata = await sharp(bestBuffer).metadata();

  return {
    buffer: bestBuffer,
    sizeKB: Math.round(bestBuffer.length / 1024),
    width: metadata.width || width,
    height: metadata.height || height,
    quality: bestQuality,
    originalSizeKB,
    compressed: true,
  };
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
  "image/bmp",
];

export function isImageMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime);
}

export function validateImageSize(
  size: number,
  maxBytes: number = 512 * 1024
): string | null {
  if (size > maxBytes) {
    return `Ukuran gambar maksimal ${Math.round(maxBytes / 1024)}KB`;
  }
  return null;
}
