/**
 * Paddle (Billing) web checkout — the web payment path.
 *
 * Paddle is the Merchant of Record. A successful checkout is ingested by
 * RevenueCat's NATIVE Paddle integration, which reads the Firebase UID from the
 * checkout's custom_data field (RC "custom field" App-User-ID mapping = firebaseUid)
 * and grants the `premium` entitlement for that UID — so the purchase unlocks
 * premium EVERYWHERE (web + app + worker) through the same entitlement App Store /
 * Play purchases use. RevenueCat stays the single source of truth; Paddle just bills.
 *
 * Requires in the Paddle dashboard: Checkout settings → default payment link +
 * approved domain (irab.app) so Paddle.js can open checkout on the live site.
 */
export const PADDLE_ENABLED = true; // LIVE — account verified, prices + token set, RC mapping done
export const PADDLE_ENV: 'sandbox' | 'production' = 'production';
export const PADDLE_CLIENT_TOKEN = 'live_00476d502201e331cada092493f';
export const PADDLE_PRICES = {
  monthly: 'pri_01kv74grvszv7sebpxqcgfw8ad',
  annual: 'pri_01kv74kx212adkg0xfvjxb4s92',
} as const;

export type PaddlePlan = keyof typeof PADDLE_PRICES;

let paddlePromise: Promise<any> | null = null;
let onCompleteCb: (() => void) | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(s);
  });
}

/** Load + initialise Paddle.js once. */
export async function loadPaddle(): Promise<any> {
  if (paddlePromise) return paddlePromise;
  paddlePromise = (async () => {
    await loadScript('https://cdn.paddle.com/paddle/v2/paddle.js');
    const Paddle = (window as any).Paddle;
    if (!Paddle) throw new Error('Paddle global missing after load');
    if (PADDLE_ENV === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (ev: any) => {
        if (ev?.name === 'checkout.completed' && onCompleteCb) {
          try { onCompleteCb(); } catch { /* ignore */ }
        }
      },
    });
    return Paddle;
  })();
  return paddlePromise;
}

export interface CheckoutOpts {
  plan: PaddlePlan;
  firebaseUid: string; // RevenueCat reads this from custom_data to map the buyer
  email?: string;
  lang?: 'ar' | 'en';
  onComplete?: () => void; // fired on Paddle 'checkout.completed'
}

/** Open the Paddle overlay checkout for a plan, tagging it with the buyer's UID. */
export async function openCheckout(opts: CheckoutOpts): Promise<void> {
  const Paddle = await loadPaddle();
  onCompleteCb = opts.onComplete ?? null;
  const priceId = PADDLE_PRICES[opts.plan];
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(opts.email ? { customer: { email: opts.email } } : {}),
    customData: { firebaseUid: opts.firebaseUid }, // ← webhook reads this
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: opts.lang === 'ar' ? 'ar' : 'en',
      allowLogout: false,
    },
  });
}
