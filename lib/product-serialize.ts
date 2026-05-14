/** Normalize seller payload for clients (verified badge uses admin approval). */
export function normalizeProductSeller<T extends { seller?: Record<string, unknown> | null }>(
  row: T
): T {
  if (!row?.seller || typeof row.seller !== "object") return row;
  const s = row.seller as Record<string, unknown>;
  return {
    ...row,
    seller: {
      ...s,
      is_verified: Boolean(s.is_verified ?? s.is_admin_approved),
    },
  };
}
