import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { empireDispatch } from "./dispatch";

/** Run scheduled Empire OS tick (call from secured cron route). */
export async function runEmpireOsCron(): Promise<{ ok: boolean; skills_note: string }> {
  if (process.env.EMPIRE_OS_ENABLED === "false") {
    return { ok: true, skills_note: "disabled" };
  }

  await empireDispatch({
    event_type: "cron.tick",
    payload: { source: "cron", at: new Date().toISOString() },
  });

  return { ok: true, skills_note: "cron.tick dispatched" };
}
