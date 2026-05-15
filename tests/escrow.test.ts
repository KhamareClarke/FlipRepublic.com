import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { escrowFieldsForNewOrder } from "@/lib/escrow";

describe("escrowFieldsForNewOrder", () => {
  const prev = process.env.ESCROW_HOLD_DAYS;

  afterEach(() => {
    if (prev === undefined) delete process.env.ESCROW_HOLD_DAYS;
    else process.env.ESCROW_HOLD_DAYS = prev;
  });

  it("returns none when hold days is 0", () => {
    process.env.ESCROW_HOLD_DAYS = "0";
    const r = escrowFieldsForNewOrder();
    expect(r.escrow_status).toBe("none");
    expect(r.payout_release_at).toBeNull();
  });

  it("returns holding with future release date", () => {
    process.env.ESCROW_HOLD_DAYS = "7";
    const r = escrowFieldsForNewOrder();
    expect(r.escrow_status).toBe("holding");
    expect(r.payout_release_at).toBeTruthy();
    expect(new Date(r.payout_release_at!).getTime()).toBeGreaterThan(Date.now());
  });
});
