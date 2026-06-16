/**
 * Paddle (Billing) web checkout — the web payment path.
 *
 * Paddle is the Merchant of Record. A successful checkout fires the
 * `paddleWebhook` Cloud Function, which grants the `premium` entitlement in
 * RevenueCat for the buyer's Firebase UID — so the purchase unlocks premium
 * EVERYWHERE (web + app + worker) through the same entitlement App Store / Play
 * purchases use. (Architecture "Option A": RevenueCat stays the single source
 * of truth; Paddle just bills.)
 *
 * ── SETUP (fill from the Paddle dashboard, then flip PADDLE_ENABLED) ──────────
 *  1. PADDLE_CLIENT_TOKEN  → Developer Tools → Authentication → client-side token
 *  2. PADDLE_PRICES.*      → Catalog → Prices → the monthly / annual price IDs (pri_…)
 *  3. PADDLE_ENV           → 'sandbox' while testing, 'production' when live
 *  4. PADDLE_ENABLED       → true ONLY when 1–3 are real (guards the live site —
 *                            while false, UIs keep the App Store CTA, nothing breaks)
 *  Webhook + secrets are configured separately on the Cloud Function side.
 */
export const PADDLE_ENABLED = false; // ← flip to true once the values below are real
export const PADDLE_ENV: 'sandbox' | 'production' = 'sandbox';
export const PADDLE_CLIENT_TOKEN = 'REPLACE_WITH_PADDLE_CLIENT_TOKEN';
export const PADDLE_PRICES = {
  monthly: 'pri_REPLACE_WITH_MONTHLY_PRICE_ID',
  annual: 'pri_REPLACE_WITH_ANNUAL_PRICE_ID',
} as const;

export type PaddlePlan = keyof typeof PADDLE_PRICES;

let paddlePromise: Promise<any> | null = null;

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
    Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
    return Paddle;
  })();
  return paddlePromise;
}

export interface CheckoutOpts {
  plan: PaddlePlan;
  firebaseUid: string; // mapped back to the buyer in the webhook via custom_data
  email?: string;
  lang?: 'ar' | 'en';
}

/** Open the Paddle overlay checkout for a plan, tagging it with the buyer's UID. */
export async function openCheckout(opts: CheckoutOpts): Promise<void> {
  const Paddle = await loadPaddle();
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
