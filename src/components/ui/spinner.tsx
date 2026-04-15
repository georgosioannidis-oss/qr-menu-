/** Small inline spinner for buttons and rows (uses `currentColor`). */
export function Spinner({
  className = "h-4 w-4",
  label,
}: {
  className?: string;
  /** When set, exposes a polite status for screen readers. */
  label?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90 ${className}`}
      role={label ? "status" : undefined}
      aria-label={label}
    />
  );
}
