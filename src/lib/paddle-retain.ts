/**
 * Paddle Retain for signed-in web buyers.
 *
 * When a web subscriber's card fails, Retain can show its "update your card"
 * notice on our pages, but only for the Paddle customer Paddle.js was told is
 * signed in (pwCustomer, ctm_ ids only). The Worker finds that id from the
 * account's Paddle purchase (/v1/paddle-customer). Called from lib/auth.ts
 * onAuth, so it runs only on pages that already load Firebase.
 *
 * Only subscribers are looked up: a Paddle subscription whose renewal failed
 * still counts as Irab+ until Paddle cancels it, which is exactly the window
 * Retain works in. Everyone else costs nothing and never loads Paddle.js.
 */
import type { User } from 'firebase/auth';
import { WORKER } from './irab/api';

const KEY = 'irab-paddle-ctm'; // cleared with the session in lib/session.ts
const FOUND_TTL = 30 * 24 * 3600e3; // a buyer's customer id does not change
const NONE_TTL = 12 * 3600e3; // "no web purchase": asked again twice a day

interface Saved { uid: string; id: string | null; at: number }

function readSaved(uid: string): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as Saved | null;
    if (!s || s.uid !== uid || typeof s.at !== 'number') return null;
    return Date.now() - s.at < (s.id ? FOUND_TTL : NONE_TTL) ? s : null;
  } catch {
    return null;
  }
}

async function lookup(user: User): Promise<string | null | undefined> {
  const res = await fetch(`${WORKER}/v1/paddle-customer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  // undefined = no answer (Worker down, endpoint not deployed yet): remember nothing.
  if (!res.ok) return undefined;
  const { customerId } = (await res.json()) as { customerId?: unknown };
  return typeof customerId === 'string' && /^ctm_[a-z0-9]+$/.test(customerId) ? customerId : null;
}

let synced = '';
let applied = ''; // the ctm_ id Paddle.js holds on this page, if any

async function apply(id: string): Promise<void> {
  if (id === applied) return;
  const { setRetainCustomer } = await import('./paddle');
  await setRetainCustomer(id);
  applied = id;
}

export async function syncRetain(user: User): Promise<void> {
  if (synced === user.uid) return; // onAuth fires again on token refresh
  synced = user.uid;
  try {
    let id = readSaved(user.uid)?.id;
    if (id === undefined) {
      let premium = false;
      try { premium = localStorage.getItem('irab-premium') === '1'; } catch { /* private mode */ }
      // Another account signed in on this page: never leave the last buyer's id.
      if (!premium) { await apply(''); return; }
      const found = await lookup(user);
      if (found === undefined) return;
      id = found;
      try { localStorage.setItem(KEY, JSON.stringify({ uid: user.uid, id, at: Date.now() })); } catch { /* private mode */ }
    }
    await apply(id ?? '');
  } catch {
    synced = ''; // try again on the next auth event
  }
}
