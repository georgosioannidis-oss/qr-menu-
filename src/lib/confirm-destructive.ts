/**
 * Browser confirmation for destructive actions (delete, revoke, etc.).
 * Every call shows an explicit "Warning:" line so staff know the action is serious.
 */
export function confirmDestructiveAction(summary: string, detail?: string): boolean {
  if (typeof window === "undefined") return false;
  const body = detail ? `${summary}\n\n${detail}` : summary;
  return window.confirm(`Warning:\n\n${body}\n\nAre you sure you want to continue?`);
}
