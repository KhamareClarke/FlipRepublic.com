import type { EmpireSkillContext } from "./types";

export async function insertSuggestion(
  ctx: EmpireSkillContext,
  row: {
    seller_id: string | null;
    suggestion_type: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.supabase.from("empire_os_suggestions").insert({
    seller_id: row.seller_id,
    suggestion_type: row.suggestion_type,
    message: row.message,
    metadata: row.metadata ?? {},
  });
}

export async function recordMetric(
  ctx: EmpireSkillContext,
  skillId: string,
  metricName: string,
  value: number
) {
  try {
    await ctx.supabase.from("empire_os_metrics").insert({
      skill_id: skillId,
      metric_name: metricName,
      metric_value: value,
    });
  } catch {
    /* metrics table optional until migration applied */
  }
}
