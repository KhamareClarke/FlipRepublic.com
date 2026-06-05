/**
 * GET /api/empire/diagnose
 * Diagnose Empire activity wiring on this project:
 *  - Are EMPIRE_HUB_URL / EMPIRE_INGEST_SECRET / EMPIRE_PROJECT_ID set?
 *  - Can we POST a test event to the hub right now?
 *  - What does the hub respond?
 *
 * Returns JSON; safe to expose since it never leaks the secret value.
 * Remove this file after the integration is confirmed working.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mask(value: string | undefined | null): string {
  if (!value) return '(missing)';
  if (value.length <= 6) return '(too short)';
  return `${value.slice(0, 3)}…${value.slice(-3)} (len=${value.length})`;
}

export async function GET(_request: NextRequest) {
  const hubUrlRaw = (process.env.EMPIRE_HUB_URL || '').trim();
  const hubUrl = hubUrlRaw.replace(/\/$/, '');
  const secret = (process.env.EMPIRE_INGEST_SECRET || '').trim();
  const projectId = (process.env.EMPIRE_PROJECT_ID || 'fliprepublic').trim();

  const env = {
    EMPIRE_HUB_URL: hubUrl || '(missing)',
    EMPIRE_INGEST_SECRET: mask(secret),
    EMPIRE_PROJECT_ID: projectId,
    NODE_ENV: process.env.NODE_ENV,
  };

  if (!hubUrl) {
    return NextResponse.json({
      ok: false,
      reason: 'EMPIRE_HUB_URL is not set on this Vercel project',
      env,
    });
  }
  if (!secret) {
    return NextResponse.json({
      ok: false,
      reason: 'EMPIRE_INGEST_SECRET is not set on this Vercel project',
      env,
    });
  }

  const target = `${hubUrl}/api/empire/activity/ingest`;
  const body = {
    project_id: projectId,
    event_type: 'custom',
    status: 'ok',
    user_email: 'diagnostic@fliprepublic.com',
    message: 'Empire diagnose endpoint — wiring check',
    metadata: { source: 'GET /api/empire/diagnose' },
  };

  let status = 0;
  let responseText = '';
  let error: string | null = null;
  let finalUrl = target;
  let hops = 0;
  try {
    let current = target;
    for (let i = 0; i < 4; i += 1) {
      const res = await fetch(current, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) {
          status = res.status;
          finalUrl = current;
          responseText = '(redirect with no Location header)';
          break;
        }
        hops += 1;
        current = new URL(loc, current).toString();
        continue;
      }
      status = res.status;
      finalUrl = current;
      responseText = (await res.text()).slice(0, 2000);
      break;
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  const ok = !error && status >= 200 && status < 300;

  return NextResponse.json({
    ok,
    env,
    request: { target, finalUrl, hops, body },
    response: { status, body: responseText, error },
    hint: ok
      ? 'Test event accepted by the hub. Open /dashboard/empire/activity on khamareclarke.com to see it.'
      : status === 401
      ? hops > 0
        ? 'Hub rejected the secret AFTER a redirect. Set EMPIRE_HUB_URL=https://www.khamareclarke.com (with www) so no redirect happens.'
        : 'Hub rejected the secret. Ensure EMPIRE_INGEST_SECRET is identical on both Vercel projects.'
      : status === 0
      ? 'Could not reach the hub at all. Check EMPIRE_HUB_URL value (use https://www.khamareclarke.com).'
      : 'Hub returned a non-2xx response. See response.body for details.',
  });
}