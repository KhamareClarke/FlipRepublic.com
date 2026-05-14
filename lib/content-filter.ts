/** Comma-separated phrases in BANNED_LISTING_TERMS (case-insensitive). */
export function findBannedListingTerms(text: string): string[] {
  const raw = process.env.BANNED_LISTING_TERMS ?? "";
  const terms = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (terms.length === 0 || !text) return [];
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t));
}
