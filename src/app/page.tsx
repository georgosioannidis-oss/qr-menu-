export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-2 text-[1.65rem] font-semibold leading-tight text-ink sm:text-2xl">QR Menu</h1>
      <p className="max-w-sm text-base leading-relaxed text-ink-muted">
        Scan the QR code at your table to view the menu, order, and pay.
      </p>
      <p className="mt-4 text-base text-ink-muted sm:text-sm">
        Use a URL like <code className="rounded bg-white/60 px-1.5 py-0.5 text-[0.95em]">/m/table-1</code> to try
        the menu.
      </p>
    </main>
  );
}
