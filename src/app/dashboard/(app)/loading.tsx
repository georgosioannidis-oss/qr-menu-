export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-ink/10" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-ink/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="h-5 w-3/4 animate-pulse rounded bg-ink/10 mb-3" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink/8 mb-2" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-ink/8" />
          </div>
        ))}
      </div>
    </div>
  );
}
