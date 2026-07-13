/** Fleet ingest → khamareclarke.com JARVIS. Env: FLEET_INGEST_SECRET, FLEET_INGEST_URL */
export interface FleetIngestInput {
  project?: string;
  event_type: string;
  summary: string;
  payload?: Record<string, unknown>;
}

const PROJECT = 'fliprepublic';

function hubUrl(): string {
  const explicit = (process.env.FLEET_INGEST_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const empireHub = (process.env.EMPIRE_HUB_URL || '').trim().replace(/\/$/, '');
  if (empireHub) return `${empireHub}/api/fleet/ingest`;
  return 'https://www.khamareclarke.com/api/fleet/ingest';
}

function ingestSecret(): string | undefined {
  const fleet = (process.env.FLEET_INGEST_SECRET || '').trim();
  if (fleet) return fleet;
  const empire = (process.env.EMPIRE_INGEST_SECRET || '').trim();
  return empire || undefined;
}

export async function emitFleetIngest(input: FleetIngestInput): Promise<void> {
  try {
    const secret = ingestSecret();
    if (!secret) {
      console.warn('[fleet-ingest] skipped — set FLEET_INGEST_SECRET or EMPIRE_INGEST_SECRET');
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(hubUrl(), {
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
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[fleet-ingest] hub returned ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn('[fleet-ingest] failed:', err instanceof Error ? err.message : err);
  }
}
