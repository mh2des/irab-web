/**
 * Reads the signed-in user's subscription status from the worker.
 *
 * The worker checks RevenueCat by the SAME Firebase uid the mobile app uses,
 * so a subscription bought on ANY platform (App Store / Play / web) unlocks
 * the web. No web-billing setup needed to *read* entitlement — only to *sell*.
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
