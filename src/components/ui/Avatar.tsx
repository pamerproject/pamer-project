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

  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
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
