import Image from "next/image";

export default function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };
  const sizePx = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

  if (src) {
    return (
      <Image
        src={src}
        alt={name || ""}
        width={sizePx[size]}
        height={sizePx[size]}
        className={`${sizeClass[size]} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div
      className={`${sizeClass[size]} flex items-center justify-center rounded-full bg-[var(--brand)] font-semibold text-white`}
    >
      {initial}
    </div>
  );
}
