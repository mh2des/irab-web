/**
 * Firebase clients for the majlis islands (player, host console, hub,
 * editor, report), created in one place.
 *
 * Under `astro dev` with the emulator switch on (see lib/firebase.ts), each
 * client is pointed at the local emulator once, before first use.
 */
import type { Database } from 'firebase/database';
import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
import { app, useEmulators } from '../firebase';

export const RTDB_URL = 'https://arabic-grammar-app-43de9-default-rtdb.firebaseio.com';
const REGION = 'us-central1';

let rtdbReady: Database | null = null;
let fnsReady: Functions | null = null;
let fsReady: Firestore | null = null;

export async function rtdb(): Promise<Database> {
  if (rtdbReady) return rtdbReady;
  const m = await import('firebase/database');
  const db = m.getDatabase(app, RTDB_URL);
  if (useEmulators) m.connectDatabaseEmulator(db, '127.0.0.1', 9000);
  return (rtdbReady = db);
}

export async function functions(): Promise<Functions> {
  if (fnsReady) return fnsReady;
  const m = await import('firebase/functions');
  const fns = m.getFunctions(app, REGION);
  if (useEmulators) m.connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  return (fnsReady = fns);
}

export async function firestore(): Promise<Firestore> {
  if (fsReady) return fsReady;
  const m = await import('firebase/firestore');
  const db = m.getFirestore(app);
  if (useEmulators) {
    try { m.connectFirestoreEmulator(db, '127.0.0.1', 8080); } catch { /* already started */ }
  }
  return (fsReady = db);
}

/** Call a majalis callable; resolves to its data. Errors keep their code in e.message. */
export async function callMajlis<T = any>(name: string, payload: unknown): Promise<T> {
  const [{ httpsCallable }, fns] = await Promise.all([import('firebase/functions'), functions()]);
  const res: any = await httpsCallable(fns, name)(payload);
  return res?.data as T;
}

/** Fire-and-forget PostHog event (the site no longer loads gtag). */
export function track(event: string, props: Record<string, string | number | boolean | null | undefined> = {}): void {
  import('../analytics').then((m) => m.track(event, props)).catch(() => {});
}
