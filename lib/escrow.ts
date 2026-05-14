/** Payout hold after checkout (logical escrow; Stripe capture unchanged). */
export function escrowFieldsForNewOrder(): {
  payout_release_at: string | null;
  escrow_status: "none" | "holding";
} {
  const days = Math.max(0, Math.min(90, Number(process.env.ESCROW_HOLD_DAYS ?? "7")));
  if (days <= 0) {
    return { payout_release_at: null, escrow_status: "none" };
  }
  const payout_release_at = new Date(Date.now() + days * 86400000).toISOString();
  return { payout_release_at, escrow_status: "holding" };
}
