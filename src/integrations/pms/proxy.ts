/**
 * Secure PMS proxy client.
 *
 * Real vendor credentials must never live in the mobile bundle. All real
 * adapters call a Supabase Edge Function (`functions/pms-proxy`) that:
 *   1. authenticates the caller (their Supabase session),
 *   2. resolves the caller's hotel + that hotel's PMS config,
 *   3. calls the vendor with the server-side credentials,
 *   4. returns normalized data.
 *
 * Contract:
 *   POST {EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pms-proxy
 *   Authorization: Bearer <supabase session access token>
 *   Body: { "provider": "mews" | "cloudbeds", "action": string, "params"?: object }
 *   Response: { "data": unknown }
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PmsProviderId } from './types';

export async function callPmsProxy(
  provider: Exclude<PmsProviderId, 'mock'>,
  action: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  if (!isSupabaseConfigured) {
    throw new Error(`[pms-proxy] Supabase is not configured. Cannot reach ${provider} (${action}).`);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error(`[pms-proxy] No active session. Sign in to fetch ${provider} data.`);
  }

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pms-proxy`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ provider, action, params }),
  });

  if (!res.ok) {
    let message = `[pms-proxy] ${provider} ${action} failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message += `: ${body.error}`;
    } catch {
      // ignore — keep the status-based message
    }
    throw new Error(message);
  }

  const body = (await res.json()) as { data?: unknown };
  return body.data;
}

export function isPmsProxyDeployedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('Function not found') || message.includes('Edge Function');
}
