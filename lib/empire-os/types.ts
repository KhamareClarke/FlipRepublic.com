import type { SupabaseClient } from "@supabase/supabase-js";

export type EmpireSkillContext = {
  supabase: SupabaseClient;
  eventId: string;
  event_type: string;
  payload: Record<string, unknown>;
  actor_user_id: string | null;
  product_id: string | null;
  order_id: string | null;
};

export type EmpireSkill = {
  /** Stable id stored in empire_os_events.skills_applied */
  id: string;
  when: (eventType: string, payload: Record<string, unknown>) => boolean;
  run: (ctx: EmpireSkillContext) => Promise<void>;
};
