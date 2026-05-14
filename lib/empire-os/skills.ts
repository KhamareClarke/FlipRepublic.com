import type { EmpireSkill, EmpireSkillContext } from "./types";

const HIGH_VALUE_GBP = 350;
const VIEW_SPIKE_24H = 25;

async function insertSuggestion(
  ctx: EmpireSkillContext,
  row: { seller_id: string | null; suggestion_type: string; message: string; metadata?: Record<string, unknown> }
) {
  await ctx.supabase.from("empire_os_suggestions").insert({
    seller_id: row.seller_id,
    suggestion_type: row.suggestion_type,
    message: row.message,
    metadata: row.metadata ?? {},
  });
}

/** Skill 18 (lite): surface large paid orders for ops review. */
const marketplacePulse: EmpireSkill = {
  id: "E18_marketplace_pulse",
  when: (t, p) => t === "order.paid" && Number(p.amount ?? 0) >= HIGH_VALUE_GBP,
  async run(ctx) {
    const amt = Number(ctx.payload.amount ?? 0);
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "high_value_order",
      message: `Paid order £${amt.toFixed(2)} — review for VIP outreach or risk checks (Empire OS).`,
      metadata: { order_id: ctx.order_id, product_id: ctx.product_id, event_id: ctx.eventId },
    });
  },
};

/** Skill 11 (lite): low tracked stock nudge to seller. */
const inventoryNudge: EmpireSkill = {
  id: "E11_inventory_nudge",
  when: (t) => t === "listing.low_stock",
  async run(ctx) {
    if (!ctx.product_id || !ctx.actor_user_id) return;
    const sq = Number(ctx.payload.stock_quantity ?? 0);
    await insertSuggestion(ctx, {
      seller_id: ctx.actor_user_id,
      suggestion_type: "low_stock",
      message:
        sq <= 0
          ? "Tracked inventory is at zero — mark sold or restock to avoid buyer confusion."
          : `Only ${sq} unit(s) left while inventory tracking is on. Consider repricing or restocking.`,
      metadata: { product_id: ctx.product_id, event_id: ctx.eventId },
    });
  },
};

/** Skill 1 (lite): traffic spike hint from recent views. */
const demandSignal: EmpireSkill = {
  id: "E17_demand_signal",
  when: (t) => t === "product.view",
  async run(ctx) {
    if (!ctx.product_id) return;
    const since = new Date(Date.now() - 24 * 3600000).toISOString();
    const { count, error } = await ctx.supabase
      .from("product_view_events")
      .select("id", { count: "exact", head: true })
      .eq("product_id", ctx.product_id)
      .gte("created_at", since);
    if (error || (count ?? 0) < VIEW_SPIKE_24H) return;

    const { data: prod } = await ctx.supabase.from("products").select("seller_id, name").eq("id", ctx.product_id).maybeSingle();
    if (!prod?.seller_id) return;

    await insertSuggestion(ctx, {
      seller_id: prod.seller_id as string,
      suggestion_type: "traffic_spike",
      message: `Strong interest: ${count} listing views in the last 24h for “${prod.name}”. Consider a coupon or featured photos.`,
      metadata: { product_id: ctx.product_id, views_24h: count, event_id: ctx.eventId },
    });
  },
};

/** Skill 9 (lite): new listing entered review pipeline. */
const listingPipeline: EmpireSkill = {
  id: "E09_listing_pipeline",
  when: (t) => t === "listing.submitted",
  async run(ctx) {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "new_listing_review",
      message: `New listing submitted${ctx.product_id ? ` (product ${ctx.product_id.slice(0, 8)}…)` : ""} — queue for moderation if not auto-approved.`,
      metadata: { product_id: ctx.product_id, actor: ctx.actor_user_id, event_id: ctx.eventId },
    });
  },
};

/** Skill 15 (lite): log high-velocity messaging for manual review. */
const commWatch: EmpireSkill = {
  id: "E15_community_watch",
  when: (t, p) => t === "message.sent" && Number(p.body_len ?? 0) > 1200,
  async run(ctx) {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "long_thread_message",
      message: "Very long buyer/seller message logged — spot-check for policy if needed.",
      metadata: { event_id: ctx.eventId, actor: ctx.actor_user_id },
    });
  },
};

export const EMPIRE_SKILLS: EmpireSkill[] = [
  marketplacePulse,
  inventoryNudge,
  demandSignal,
  listingPipeline,
  commWatch,
];
