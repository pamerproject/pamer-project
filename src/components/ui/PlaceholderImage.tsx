import Image from "next/image";

export default function PlaceholderImage({
  text,
  width = 640,
  height = 360,
  bg = "#1a1a2e",
  color = "#dc2626",
  className = "",
}: {
  text: string;
  width?: number;
  height?: number;
  bg?: string;
  color?: string;
  className?: string;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect fill="${bg}" width="${width}" height="${height}"/>
    <rect fill="${color}" opacity="0.1" width="${width}" height="${height}" rx="0"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${color}" font-family="Inter,system-ui,sans-serif" font-size="${Math.min(width, height) * 0.15}" font-weight="800" letter-spacing="1">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
    <rect x="${width * 0.1}" y="${height * 0.7}" width="${width * 0.8}" height="4" rx="2" fill="${color}" opacity="0.2"/>
    <rect x="${width * 0.1}" y="${height * 0.78}" width="${width * 0.5}" height="4" rx="2" fill="${color}" opacity="0.1"/>
  </svg>`;

  const encoded = svg
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/"/g, "'");

  return (
    /* unoptimized: data URI SVG inline, tidak ada yang perlu dioptimasi */
    <Image
      src={`data:image/svg+xml,${encoded}`}
      alt={text}
      width={width}
      height={height}
      unoptimized
      className={className}
      style={{ width, height, maxHeight: height, objectFit: "cover" }}
    />
  );
}
