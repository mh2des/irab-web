/**
 * One free allowance per person, not per account. The Worker counts a free
 * account's use on this site per browser too (cloudflare-workers
 * src/lib/web_guard.ts): send it a random id this browser keeps and the
 * device signature the guest tries already use. It also refuses free AI to an
 * email account that has not confirmed its address, or uses a throwaway
 * inbox; emailGateFor() turns that answer into the paywall's email view.
 *
 * Requires the Worker that allows these headers (CORS); deploy it first.
 */
import { getFingerprint } from './irab/fingerprint';

const DEVICE_KEY = 'irab-did';
let memoryId: string | null = null;

function deviceId(): string {
  try {
    const kept = localStorage.getItem(DEVICE_KEY);
    if (kept && /^[a-f0-9]{32}$/.test(kept)) return kept;
    const id = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    // Private mode without storage: one id for this page's life.
    memoryId ??= Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    return memoryId;
  }
}

/** Headers for every signed-in call to the Worker. */
export async function guardHeaders(): Promise<Record<string, string>> {
  const sig = await getFingerprint().catch(() => '');
  return { 'X-Irab-Device': deviceId(), ...(/^[a-f0-9]{16}$/.test(sig) ? { 'X-Irab-Sig': sig } : {}) };
}

/**
 * True (and the email view is open) when [body] is the Worker's refusal for
 * an unconfirmed or throwaway email address.
 */
export function emailGateFor(status: number, body: any): boolean {
  const error = String(body?.error ?? '');
  if (status !== 403 || (error !== 'email_unverified' && error !== 'email_disposable')) return false;
  (window as any).IrabPaywall?.showEmail(error === 'email_unverified' ? 'unverified' : 'disposable');
  return true;
}
