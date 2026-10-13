/**
 * The guest device id for the three free analyses (the Worker counts them
 * per fingerprint, lifetime, 90-day TTL). Same key and signature as the old
 * live demo, so a returning guest keeps their count. The rule: include what
 * separates one visitor from another, exclude what changes over time for
 * everyone (browser major version, DST offset).
 */
const FP_KEY = 'irab-fp';

function deviceSignature(): string {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? 'edge' :
    /OPR\//.test(ua) ? 'opera' :
    /Firefox\//.test(ua) ? 'firefox' :
    /Chrome\//.test(ua) ? 'chrome' :
    /Safari\//.test(ua) ? 'safari' : 'other';
  const platform =
    /iPhone/.test(ua) ? 'iphone' :
    /iPad/.test(ua) ? 'ipad' :
    /Android/.test(ua) ? 'android' :
    /Macintosh/.test(ua) ? 'mac' :
    /Windows/.test(ua) ? 'windows' :
    /Linux/.test(ua) ? 'linux' : 'other';
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* older engine */ }
  if (!tz) tz = String(new Date().getTimezoneOffset());
  const dims = [screen.width, screen.height].sort((a, b) => a - b).join('x');
  return [browser, platform, navigator.language, `${dims}x${screen.colorDepth}`, tz,
    navigator.hardwareConcurrency || '', (navigator as any).deviceMemory || ''].join('|');
}

export async function getFingerprint(): Promise<string> {
  try {
    const cached = localStorage.getItem(FP_KEY);
    if (cached && /^[a-f0-9]{16}$/.test(cached)) return cached;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceSignature()));
    const fp = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    localStorage.setItem(FP_KEY, fp);
    return fp;
  } catch {
    // No crypto or storage: uncapped by fingerprint; the per-IP cap remains.
    return 'anon-' + Math.random().toString(36).slice(2, 10);
  }
}

/** Guest analyses used on this device (shared with the old demo's key). */
const QUOTA_KEY = 'irab-demo-quota';
export const GUEST_TRIES = 3;
export function guestUsed(): number {
  try { return parseInt(localStorage.getItem(QUOTA_KEY) || '0', 10) || 0; } catch { return 0; }
}
export function bumpGuestUsed(): void {
  try { localStorage.setItem(QUOTA_KEY, String(guestUsed() + 1)); } catch { /* private mode */ }
}
