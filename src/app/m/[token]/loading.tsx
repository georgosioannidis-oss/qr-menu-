export default function MenuLoading() {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-neutral-950">
      <header className="shrink-0 border-b border-white/10 bg-neutral-950/95 px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="h-6 w-40 animate-pulse rounded-md bg-white/10" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded-md bg-white/10" />
          </div>
          <div className="h-10 w-24 animate-pulse rounded-xl bg-white/10" />
        </div>
        <div className="mt-3 flex gap-2 pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-20 shrink-0 animate-pulse rounded-full bg-white/10" />
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-hidden px-4 py-5">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10 mb-5" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex gap-4">
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/8" />
                  <div className="mt-3 flex justify-between items-center">
                    <div className="h-6 w-16 animate-pulse rounded bg-white/10" />
                    <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
