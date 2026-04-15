/**
 * Minimal shell for print-friendly pages (no dashboard nav — keeps kitchen tickets clean).
 */
export default function DashboardPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="print-zone min-h-screen bg-neutral-50 text-neutral-900">{children}</div>;
}
