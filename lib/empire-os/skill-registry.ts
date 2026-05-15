import type { EmpireSkill } from "./types";
import { insertSuggestion, recordMetric } from "./helpers";

const HIGH_VALUE_GBP = 350;
const VIEW_SPIKE_24H = 25;

function skill(
  id: string,
  when: EmpireSkill["when"],
  run: EmpireSkill["run"]
): EmpireSkill {
  return { id, when, run };
}

/** All 33 Empire OS skills (lite / rule-based, human-in-the-loop). */
export const EMPIRE_SKILLS: EmpireSkill[] = [
  // —— Buyer engagement 1–8 ——
  skill("E01_smart_recommendations", (t) => t === "order.paid", async (ctx) => {
    if (!ctx.actor_user_id) return;
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "buyer_recommendations",
      message: "Repeat buyer completed purchase — consider curated follow-up listing email (Empire OS E01).",
      metadata: { buyer_id: ctx.actor_user_id, order_id: ctx.order_id },
    });
    await recordMetric(ctx, "E01_smart_recommendations", "triggered", 1);
  }),

  skill("E02_dynamic_pricing", (t, p) => t === "product.view" && Number(p.views_24h ?? 0) < 3, async (ctx) => {
    if (!ctx.product_id) return;
    const { data: prod } = await ctx.supabase
      .from("products")
      .select("seller_id, name, price, created_at")
      .eq("id", ctx.product_id)
      .maybeSingle();
    if (!prod?.seller_id) return;
    const ageDays = (Date.now() - new Date(prod.created_at as string).getTime()) / 86400000;
    if (ageDays < 7) return;
    await insertSuggestion(ctx, {
      seller_id: prod.seller_id as string,
      suggestion_type: "repricing_hint",
      message: `“${prod.name}” has low recent views — consider a modest price adjustment (Empire OS E02).`,
      metadata: { product_id: ctx.product_id, price: prod.price },
    });
  }),

  skill(
    "E03_offer_negotiation",
    (t, p) => t === "offer.created" && Number(p.ratio_to_list ?? 1) < 0.75,
    async (ctx) => {
      const sellerId = ctx.payload.seller_id as string | undefined;
      if (!sellerId) return;
      await insertSuggestion(ctx, {
        seller_id: sellerId,
        suggestion_type: "offer_counter_hint",
        message: "Offer is well below list price — review counter or accept if margin still works (Empire OS E03).",
        metadata: { offer_id: ctx.payload.offer_id, ratio: ctx.payload.ratio_to_list },
      });
    }
  ),

  skill("E04_email_timing", (t) => t === "cron.tick", async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "email_ops",
      message: "Weekly check: peak buyer activity is Tue–Thu evenings UK — schedule campaigns accordingly (Empire OS E04).",
      metadata: { cron: true },
    });
  }),

  skill("E05_abandonment_recovery", (t, p) => t === "checkout.started" && Number(p.amount ?? 0) > 50, async (ctx) => {
    const amt = Number(ctx.payload.amount ?? 0);
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "abandoned_checkout",
      message: `Checkout started (£${amt.toFixed(2)}) — monitor Stripe incomplete sessions for recovery (Empire OS E05).`,
      metadata: { product_id: ctx.product_id },
    });
  }),

  skill("E06_loyalty_tiers", (t, p) => t === "order.paid" && Number(p.buyer_order_count ?? 0) >= 3, async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "loyalty_buyer",
      message: `Buyer has ${ctx.payload.buyer_order_count}+ orders — eligible for loyalty outreach (Empire OS E06).`,
      metadata: { buyer_id: ctx.actor_user_id },
    });
  }),

  skill("E07_community_trust", (t, p) => t === "review.posted" && Number(p.rating ?? 5) <= 2, async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: (ctx.payload.seller_id as string) ?? null,
      suggestion_type: "low_rating_review",
      message: "New low rating on a listing — seller may want to respond or improve listing detail (Empire OS E07).",
      metadata: { product_id: ctx.product_id, rating: ctx.payload.rating },
    });
  }),

  skill("E08_zero_results_search", (t, p) => t === "search.performed" && Number(p.result_count ?? 1) === 0, async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "search_gap",
      message: `Zero-result search: “${String(ctx.payload.query ?? "").slice(0, 80)}” — consider sourcing or SEO (Empire OS E08).`,
      metadata: { query: ctx.payload.query },
    });
  }),

  // —— Seller growth 9–16 ——
  skill("E09_listing_pipeline", (t) => t === "listing.submitted", async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "new_listing_review",
      message: `New listing submitted${ctx.product_id ? ` (${ctx.product_id.slice(0, 8)}…)` : ""} — moderation queue (Empire OS E09).`,
      metadata: { product_id: ctx.product_id },
    });
  }),

  skill("E10_seller_tier", (t, p) => t === "order.paid" && Number(p.seller_paid_orders ?? 0) >= 10, async (ctx) => {
    const sid = ctx.payload.seller_id as string | undefined;
    if (!sid) return;
    await insertSuggestion(ctx, {
      seller_id: sid,
      suggestion_type: "seller_milestone",
      message: "10+ paid orders on record — consider verified seller badge review (Empire OS E10).",
      metadata: { seller_paid_orders: ctx.payload.seller_paid_orders },
    });
  }),

  skill("E11_inventory_nudge", (t) => t === "listing.low_stock", async (ctx) => {
    if (!ctx.product_id || !ctx.actor_user_id) return;
    const sq = Number(ctx.payload.stock_quantity ?? 0);
    await insertSuggestion(ctx, {
      seller_id: ctx.actor_user_id,
      suggestion_type: "low_stock",
      message:
        sq <= 0
          ? "Tracked inventory at zero — mark sold or restock (Empire OS E11)."
          : `Only ${sq} unit(s) left — restock or adjust price (Empire OS E11).`,
      metadata: { product_id: ctx.product_id },
    });
  }),

  skill("E12_inventory_optimization", (t) => t === "listing.inventory_updated", async (ctx) => {
    if (!ctx.product_id || !ctx.actor_user_id) return;
    await insertSuggestion(ctx, {
      seller_id: ctx.actor_user_id,
      suggestion_type: "inventory_sync",
      message: "Inventory updated — confirm marketplace status matches stock (Empire OS E12).",
      metadata: { product_id: ctx.product_id },
    });
  }),

  skill("E13_shipping_automation", (t) => t === "order.paid", async (ctx) => {
    const sid = ctx.payload.seller_id as string | undefined;
    if (!sid) return;
    await insertSuggestion(ctx, {
      seller_id: sid,
      suggestion_type: "ship_order",
      message: "New paid order — mark shipped when dispatched and add tracking if available (Empire OS E13).",
      metadata: { order_id: ctx.order_id },
    });
  }),

  skill("E14_auth_fast_track", (t) => t === "listing.submitted", async (ctx) => {
    if (!ctx.actor_user_id) return;
    const { count } = await ctx.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", ctx.actor_user_id)
      .eq("status", "active");
    if ((count ?? 0) < 5) return;
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "trusted_seller_listing",
      message: "Experienced seller submitted listing — eligible for faster image verification (Empire OS E14).",
      metadata: { seller_id: ctx.actor_user_id, active_listings: count },
    });
  }),

  skill("E15_community_watch", (t, p) => t === "message.sent" && Number(p.body_len ?? 0) > 1200, async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "long_thread_message",
      message: "Very long message — spot-check for policy if needed (Empire OS E15).",
      metadata: { actor: ctx.actor_user_id },
    });
  }),

  skill("E16_performance_insights", (t) => t === "cron.tick", async (ctx) => {
    const { count } = await ctx.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "weekly_ops",
      message: `Empire OS weekly pulse: ${count ?? 0} orders in the last 7 days. Review seller analytics dashboards (E16).`,
      metadata: { orders_7d: count },
    });
    await recordMetric(ctx, "E16_performance_insights", "orders_7d", count ?? 0);
  }),

  // —— Operations 17–24 ——
  skill("E17_demand_signal", (t) => t === "product.view", async (ctx) => {
    if (!ctx.product_id) return;
    const since = new Date(Date.now() - 24 * 3600000).toISOString();
    const { count, error } = await ctx.supabase
      .from("product_view_events")
      .select("id", { count: "exact", head: true })
      .eq("product_id", ctx.product_id)
      .gte("created_at", since);
    if (error || (count ?? 0) < VIEW_SPIKE_24H) return;
    const { data: prod } = await ctx.supabase
      .from("products")
      .select("seller_id, name")
      .eq("id", ctx.product_id)
      .maybeSingle();
    if (!prod?.seller_id) return;
    await insertSuggestion(ctx, {
      seller_id: prod.seller_id as string,
      suggestion_type: "traffic_spike",
      message: `${count} views in 24h on “${prod.name}” — strong demand signal (Empire OS E17).`,
      metadata: { views_24h: count },
    });
  }),

  skill("E18_marketplace_pulse", (t, p) => t === "order.paid" && Number(p.amount ?? 0) >= HIGH_VALUE_GBP, async (ctx) => {
    const amt = Number(ctx.payload.amount ?? 0);
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "high_value_order",
      message: `High-value paid order £${amt.toFixed(2)} — VIP / risk review (Empire OS E18).`,
      metadata: { order_id: ctx.order_id },
    });
  }),

  skill("E19_content_moderation", (t) => t === "listing.submitted", async (ctx) => {
    const price = Number(ctx.payload.price ?? 0);
    if (price < 2000) return;
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "high_ticket_listing",
      message: `High-ticket listing (£${price.toFixed(0)}) submitted — prioritize authentication review (Empire OS E19).`,
      metadata: { product_id: ctx.product_id, price },
    });
  }),

  skill("E20_category_intelligence", (t) => t === "cron.tick", async (ctx) => {
    const { data } = await ctx.supabase.from("products").select("category_id").eq("status", "active").limit(500);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const k = (row.category_id as string) ?? "none";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return;
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "category_balance",
      message: `Largest active category bucket has ${top[1]} listings — review merchandising balance (Empire OS E20).`,
      metadata: { category_id: top[0], count: top[1] },
    });
  }),

  skill("E21_fraud_detection", (t) => t === "dispute.opened", async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "dispute_alert",
      message: "New order dispute opened — review evidence and escrow status promptly (Empire OS E21).",
      metadata: { order_id: ctx.order_id },
    });
  }),

  skill("E22_seasonal_campaigns", (t) => t === "cron.tick", async (ctx) => {
    const month = new Date().getMonth();
    const season = month >= 10 || month <= 1 ? "holiday" : month >= 5 && month <= 8 ? "summer" : "standard";
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "seasonal_campaign",
      message: `Season mode: ${season} — plan platform coupons and featured drops (Empire OS E22).`,
      metadata: { season },
    });
  }),

  skill("E23_review_quality", (t, p) => t === "review.posted" && Number(p.body_len ?? 100) < 12, async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "thin_review",
      message: "Very short review posted — monitor for spam patterns (Empire OS E23).",
      metadata: { product_id: ctx.product_id },
    });
  }),

  skill("E24_partnerships", (t) => t === "cron.tick", async (ctx) => {
    const { count } = await ctx.supabase
      .from("seller_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if ((count ?? 0) < 3) return;
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "seller_pipeline",
      message: `${count} pending seller applications — clear backlog to grow supply (Empire OS E24).`,
      metadata: { pending: count },
    });
  }),

  // —— Revenue 25–29 ——
  skill("E25_commission_optimization", (t, p) => t === "order.paid" && Number(p.amount ?? 0) > 500, async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "revenue_ops",
      message: "High GMV order — review fee structure and seller tier incentives (Empire OS E25).",
      metadata: { amount: ctx.payload.amount },
    });
  }),

  skill("E26_payment_methods", (t) => t === "cron.tick", async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "payments_stack",
      message: "Confirm Stripe Link / Apple Pay / Google Pay enabled in Stripe Dashboard for conversion (Empire OS E26).",
      metadata: {},
    });
  }),

  skill("E27_cross_sell", (t) => t === "order.paid", async (ctx) => {
    if (!ctx.product_id) return;
    const { data: cat } = await ctx.supabase
      .from("products")
      .select("category_id, seller_id, name")
      .eq("id", ctx.product_id)
      .maybeSingle();
    if (!cat?.category_id || !cat.seller_id) return;
    const { count } = await ctx.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", cat.seller_id)
      .eq("category_id", cat.category_id)
      .eq("status", "active")
      .neq("id", ctx.product_id);
    if ((count ?? 0) < 2) return;
    await insertSuggestion(ctx, {
      seller_id: cat.seller_id as string,
      suggestion_type: "cross_sell",
      message: `Buyer purchased “${cat.name}” — seller has ${count} more items in category for bundle outreach (Empire OS E27).`,
      metadata: { product_id: ctx.product_id },
    });
  }),

  skill("E28_seller_fees", (t) => t === "order.paid", async (ctx) => {
    const sid = ctx.payload.seller_id as string | undefined;
    if (!sid) return;
    await insertSuggestion(ctx, {
      seller_id: sid,
      suggestion_type: "payout_timing",
      message: "Order paid — payout releases after escrow window; plan cash flow accordingly (Empire OS E28).",
      metadata: { order_id: ctx.order_id },
    });
  }),

  skill("E29_value_capture", (t) => t === "cron.tick", async (ctx) => {
    const { count } = await ctx.supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "promo_health",
      message: `${count ?? 0} active coupons — audit redemption caps and margin impact (Empire OS E29).`,
      metadata: { active_coupons: count },
    });
  }),

  // —— Analytics 30–33 ——
  skill("E30_customer_segmentation", (t) => t === "cron.tick", async (ctx) => {
    const { count } = await ctx.supabase.from("sellers").select("user_id", { count: "exact", head: true });
    await recordMetric(ctx, "E30_customer_segmentation", "active_sellers", count ?? 0);
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "segmentation_snapshot",
      message: `Platform has ${count ?? 0} seller profiles — export cohorts from Supabase for campaigns (Empire OS E30).`,
      metadata: { sellers: count },
    });
  }),

  skill("E31_market_trends", (t) => t === "search.performed", async (ctx) => {
    const q = String(ctx.payload.query ?? "").trim();
    if (q.length < 3) return;
    await recordMetric(ctx, "E31_market_trends", "search_query_len", q.length);
  }),

  skill("E32_competitive_intel", (t) => t === "cron.tick", async (ctx) => {
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "competitive_check",
      message: "Quarterly competitive review: pricing vs StockX/SNKSR benchmarks for top SKUs (Empire OS E32).",
      metadata: { manual: true },
    });
  }),

  skill("E33_continuous_optimization", (t) => t === "cron.tick", async (ctx) => {
    const { count } = await ctx.supabase
      .from("empire_os_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString());
    await recordMetric(ctx, "E33_continuous_optimization", "events_24h", count ?? 0);
    await insertSuggestion(ctx, {
      seller_id: null,
      suggestion_type: "empire_health",
      message: `${count ?? 0} Empire OS events in 24h — review skill hit rate in admin console (Empire OS E33).`,
      metadata: { events_24h: count },
    });
  }),
];

export const EMPIRE_SKILL_COUNT = EMPIRE_SKILLS.length;
