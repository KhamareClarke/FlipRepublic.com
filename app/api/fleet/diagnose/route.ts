import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROJECT = 'fliprepublic';

function mask(value: string | undefined | null): string {
  if (!value) return '(missing)';
  if (value.length <= 6) return '(too short)';
  return `${value.slice(0, 3)}…${value.slice(-3)} (len=${value.length})`;
}

export async function GET(_request: NextRequest) {
  const fleetUrl = (process.env.FLEET_INGEST_URL || '').trim();
  const empireHub = (process.env.EMPIRE_HUB_URL || '').trim().replace(/\/$/, '');
  const hubUrl = (
    fleetUrl || (empireHub ? `${empireHub}/api/fleet/ingest` : 'https://www.khamareclarke.com/api/fleet/ingest')
  ).replace(/\/$/, '');
  const fleetSecret = (process.env.FLEET_INGEST_SECRET || '').trim();
  const empireSecret = (process.env.EMPIRE_INGEST_SECRET || '').trim();
  const secret = fleetSecret || empireSecret;

  const env = {
    FLEET_INGEST_URL: fleetUrl || '(default)',
    FLEET_INGEST_SECRET: mask(fleetSecret),
    EMPIRE_HUB_URL: empireHub || '(missing)',
    EMPIRE_INGEST_SECRET: mask(empireSecret),
    secret_used: fleetSecret ? 'FLEET_INGEST_SECRET' : empireSecret ? 'EMPIRE_INGEST_SECRET (fallback)' : '(none)',
  };

  if (!secret) {
    return NextResponse.json({ ok: false, reason: 'No fleet/empire ingest secret configured', env });
  }

  let status = 0;
  let responseText = '';
  let error: string | null = null;
  try {
    const res = await fetch(hubUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        project: PROJECT,
        event_type: 'test',
        summary: `Fleet diagnose — ${PROJECT}`,
        payload: { source: 'GET /api/fleet/diagnose' },
      }),
      cache: 'no-store',
    });
    status = res.status;
    responseText = (await res.text()).slice(0, 2000);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const ok = !error && status >= 200 && status < 300;
  return NextResponse.json({
    ok,
    env,
    request: { target: hubUrl },
    response: { status, body: responseText, error },
    hint: ok
      ? 'Fleet wiring OK — check JARVIS All projects.'
      : status === 401
        ? 'Hub rejected secret — align FLEET_INGEST_SECRET with khamareclarke.com hub.'
        : 'See response.body for details.',
  });
}
