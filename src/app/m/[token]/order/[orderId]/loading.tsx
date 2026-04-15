export default function OrderStatusLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-950">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="h-16 w-16 mx-auto animate-pulse rounded-full bg-white/10" />
        <div className="h-6 w-48 mx-auto animate-pulse rounded bg-white/10" />
        <div className="h-4 w-32 mx-auto animate-pulse rounded bg-white/8" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-white/10 mt-6" />
      </div>
    </div>
  );
}
