"use client";

export default function TableMenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-6 text-neutral-900">
      <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-neutral-600 mb-4">
          We couldn&apos;t load this table menu. If you just updated the app, run{" "}
          <code className="rounded bg-neutral-100 px-1">npx prisma db push</code> and restart the dev server.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full min-h-[48px] rounded-xl bg-neutral-900 text-white px-4 py-3 text-sm font-semibold hover:bg-neutral-800"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
