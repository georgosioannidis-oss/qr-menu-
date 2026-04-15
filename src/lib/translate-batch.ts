/**
 * Batch machine translation for menu content.
 * Set LIBRETRANSLATE_URL (e.g. https://libretranslate.com) for live translation.
 * Without it, returns originals (structure ready for production keys).
 */
export async function translateTexts(
  texts: string[],
  source: string,
  target: string
): Promise<string[]> {
  const filtered = texts.map((t) => (t ?? "").trim());
  if (source === target || filtered.length === 0) return texts;

  const base = process.env.LIBRETRANSLATE_URL?.replace(/\/$/, "");
  if (!base) {
    return texts;
  }

  const out: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const q = filtered[i];
    if (!q) {
      out.push(texts[i] ?? "");
      continue;
    }
    try {
      const res = await fetch(`${base}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q,
          source: source === "auto" ? "auto" : source,
          target,
          format: "text",
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        out.push(texts[i] ?? "");
        continue;
      }
      const data = (await res.json()) as { translatedText?: string };
      out.push(data.translatedText ?? texts[i] ?? "");
    } catch {
      out.push(texts[i] ?? "");
    }
  }
  return out;
}
