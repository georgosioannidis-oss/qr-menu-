/**
 * Branding helpers: dashboard and guest menu use these for primary / hover colors.
 */

/** Darken a hex color by a percentage (0–1). Supports #rgb and #rrggbb. */
export function darkenHex(hex: string, amount = 0.15): string {
  let s = hex.replace(/^#/, "").trim();
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const match = s.match(/.{2}/g);
  if (!match || match.length !== 3) return hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(match[0], 16) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(match[1], 16) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(match[2], 16) * (1 - amount))));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function isValidHex(color: string): boolean {
  return HEX_REGEX.test(color.trim());
}
