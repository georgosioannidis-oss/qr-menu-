"use client";

/**
 * Catches errors in `m/[token]/layout` (e.g. DB connection / schema mismatch).
 */
export default function MenuSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 p-6 text-neutral-900">
      <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-lg font-bold mb-2">Menu can&apos;t load</h1>
        <p className="text-sm text-neutral-600 mb-4">
          {error.message?.includes("column") || error.message?.includes("does not exist")
            ? "The database may be out of date. From your project folder run: npx prisma db push"
            : "Check that the server is running, your .env DATABASE_URL is correct, and you used a valid table link (e.g. /m/table-1 after seeding)."}
        </p>
        {error.digest && (
          <p className="text-xs text-neutral-400 mb-4 font-mono">Ref: {error.digest}</p>
        )}
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
