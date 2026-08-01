export default function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Cover skeleton */}
      <div className="h-48 w-full rounded-t-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />

      {/* Profile header skeleton */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <div className="flex items-start gap-4">
          <div className="h-24 w-24 shrink-0 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          <div className="flex-1 space-y-3 pt-4">
            <div className="h-6 w-48 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
            <div className="h-4 w-32 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            <div className="flex gap-4">
              <div className="h-12 w-16 rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
              <div className="h-12 w-16 rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
              <div className="h-12 w-16 rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Feed cards */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
              <div className="h-3 w-1/4 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="h-4 w-full rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
            <div className="h-4 w-5/6 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            <div className="h-4 w-2/3 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
