/** Fleet ingest → khamareclarke.com JARVIS. Env: FLEET_INGEST_SECRET, FLEET_INGEST_URL */
export interface FleetIngestInput {
  project?: string;
  event_type: string;
  summary: string;
  payload?: Record<string, unknown>;
}

const PROJECT = 'fliprepublic';

function hubUrl(): string {
  return (process.env.FLEET_INGEST_URL || 'https://www.khamareclarke.com/api/fleet/ingest').trim().replace(/\/$/, '');
}

export async function emitFleetIngest(input: FleetIngestInput): Promise<void> {
  try {
    const secret = process.env.FLEET_INGEST_SECRET;
    if (!secret) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await fetch(hubUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        project: input.project || PROJECT,
        event_type: input.event_type,
        summary: input.summary,
        payload: input.payload || {},
      }),
      signal: controller.signal,
      cache: 'no-store',
    }).catch(() => undefined);
    clearTimeout(timeout);
  } catch {
    /* best-effort */
  }
}
