/**
 * Empire user-activity emitter — fire-and-forget POST to the central
 * khamareclarke.com hub so every sign-in / sign-up / payment / etc.
 * shows on the cross-project dashboard.
 *
 * Required env vars:
 *   EMPIRE_HUB_URL          e.g. https://www.khamareclarke.com (use the www host)
 *   EMPIRE_INGEST_SECRET    long random string shared with the hub
 *   EMPIRE_PROJECT_ID       slug for this project, e.g. "adsstarter"
 */
import type { NextRequest } from 'next/server';

export type EmpireEventType =
  | 'signin'
  | 'signin_failed'
  | 'signup'
  | 'signup_failed'
  | 'verify_email'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'project_created'
  | 'audit_started'
  | 'audit_completed'
  | 'audit_failed'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'lead_created'
  | 'logout'
  | 'custom';

export interface EmpireActivityInput {
  event_type: EmpireEventType;
  status?: 'ok' | 'failed' | 'pending';
  user_email?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  source?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest | Request;
}

const PROJECT_ID = process.env.EMPIRE_PROJECT_ID || 'fliprepublic';

function clientIp(request?: NextRequest | Request): string | null {
  if (!request) return null;
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

function hubUrl(): string | null {
  const raw = (process.env.EMPIRE_HUB_URL || '').trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

async function fetchPreservingAuth(
  url: string,
  init: RequestInit,
  maxHops = 3
): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    const res = await fetch(current, { ...init, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects (>${maxHops}) from ${url}`);
}

export async function emitEmpireActivity(input: EmpireActivityInput): Promise<void> {
  try {
    const url = hubUrl();
    const secret = process.env.EMPIRE_INGEST_SECRET;
    if (!url || !secret) return;

    const body = {
      project_id: PROJECT_ID,
      event_type: input.event_type,
      status: input.status || (input.event_type.endsWith('_failed') ? 'failed' : 'ok'),
      user_email: input.user_email ?? null,
      user_id: input.user_id ?? null,
      user_name: input.user_name ?? null,
      source: input.source || 'web',
      message: input.message,
      metadata: input.metadata || {},
      ip: clientIp(input.request),
      user_agent: input.request?.headers.get('user-agent') || null,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    await fetchPreservingAuth(`${url}/api/empire/activity/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    }).catch(() => undefined);

    clearTimeout(timeout);

    const { emitFleetIngest } = await import('./fleet-ingest');
    const fleetType =
      input.event_type === 'payment_succeeded'
        ? 'order'
        : input.event_type === 'lead_created'
          ? 'lead'
          : input.event_type;
    void emitFleetIngest({
      event_type: fleetType,
      summary: input.message || `${input.event_type}: ${input.user_email || PROJECT_ID}`,
      payload: {
        ...(input.metadata || {}),
        user_email: input.user_email,
        user_id: input.user_id,
        user_name: input.user_name,
        empire_event_type: input.event_type,
      },
    });
  } catch {
    // Best-effort telemetry — never throws.
  }
}
