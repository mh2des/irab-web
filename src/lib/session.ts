/**
 * Tiny signed-in marker: NO Firebase import, so it's safe to load on every
 * page (incl. the high-traffic homepage). Set at login / cleared at logout.
 * The analyzer reads this synchronously and only lazy-loads the Firebase SDK
 * when a user is actually signed in, keeping anonymous pages Firebase-free.
 */
const FLAG = 'irab-signedin';

export function rememberSignedIn(): void {
  try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
}
export function forgetSignedIn(): void {
  try { localStorage.removeItem(FLAG); } catch { /* ignore */ }
}
export function maybeSignedIn(): boolean {
  try { return localStorage.getItem(FLAG) === '1'; } catch { return false; }
}
