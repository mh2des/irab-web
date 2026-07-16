/**
 * Reads the signed-in user's subscription status from the worker.
 *
 * The worker checks RevenueCat by the SAME Firebase uid the mobile app uses,
 * so a subscription bought on ANY platform (App Store / Play / web) unlocks
 * the web. No web-billing setup needed to *read* entitlement: only to *sell*.
 */
import type { User } from 'firebase/auth';

const WORKER = 'https://irab-api-v2.mansourhassan783.workers.dev';

export interface Me { uid: string; premium: boolean; }

export async function fetchMe(user: User): Promise<Me | null> {
  try {
    const token = await user.getIdToken();
    const res = await fetch(`${WORKER}/v1/me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<Me>;
    return { uid: String(data.uid ?? user.uid), premium: data.premium === true };
  } catch {
    return null;
  }
}

export async function isPremium(user: User): Promise<boolean> {
  const me = await fetchMe(user);
  return me?.premium === true;
}

/**
 * Poll /v1/me after a checkout until premium unlocks. Provisioning is
 * asynchronous (Paddle webhook → RevenueCat → worker), usually seconds but
 * occasionally minutes. Two phases: a quick phase (12 × 3s ≈ 36s), then —
 * after notifying the UI via onSlow — a patient phase (24 × 5s ≈ 2 min).
 * Resolves true the moment premium is seen; false only after ~2.5 minutes.
 */
export async function waitForPremium(user: User, opts?: { onSlow?: () => void }): Promise<boolean> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const check = async () => { try { return (await fetchMe(user))?.premium === true; } catch { return false; } };
  for (let i = 0; i < 12; i++) {
    await sleep(3000);
    if (await check()) return true;
  }
  try { opts?.onSlow?.(); } catch { /* UI callback must never abort polling */ }
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    if (await check()) return true;
  }
  return false;
}
