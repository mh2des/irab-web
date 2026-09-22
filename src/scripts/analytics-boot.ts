/**
 * Runs once per page after window.load (imported from BaseLayout):
 *   1. initialise PostHog
 *   2. decorate store badges: Play links get the attribution `referrer`,
 *      every badge reports store_badge_clicked
 *   3. pricing CTAs report pricing_cta_clicked
 * Identity sync with Firebase auth lives in lib/auth.ts so pages without
 * auth never load the Firebase bundle for analytics' sake.
 */
import { initAnalytics, referrerPayload, track } from '../lib/analytics';

const PLAY = 'play.google.com/store/apps/details';
const APPLE = 'apps.apple.com/';

function placementOf(a: HTMLAnchorElement): string {
  const explicit = a.dataset.placement;
  if (explicit) return explicit;
  const host = a.closest<HTMLElement>('[id], section, footer, header, nav');
  if (!host) return 'page';
  return host.id || host.tagName.toLowerCase();
}

function decorateStoreLinks(): void {
  const anchors = document.querySelectorAll<HTMLAnchorElement>(`a[href*="${PLAY}"], a[href*="${APPLE}"]`);
  if (!anchors.length) return;
  let payload: string | null = null;
  anchors.forEach((a) => {
    const isPlay = a.href.includes(PLAY);
    let attached = false;
    if (isPlay) {
      try {
        payload ??= referrerPayload();
        const url = new URL(a.href);
        url.searchParams.set('referrer', payload);
        a.href = url.toString();
        attached = true;
      } catch { /* leave the link as it was */ }
    }
    const placement = placementOf(a);
    a.addEventListener('click', () => {
      track('store_badge_clicked', {
        store: isPlay ? 'play' : 'app_store',
        placement,
        referrer_attached: attached,
      });
    }, { passive: true });
  });
}

function decoratePricingCtas(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href*="checkout="]').forEach((a) => {
    a.addEventListener('click', () => {
      const plan = new URL(a.href, location.origin).searchParams.get('checkout') ?? 'unknown';
      track('pricing_cta_clicked', { plan, placement: placementOf(a) });
    }, { passive: true });
  });
}

async function boot(): Promise<void> {
  const ph = await initAnalytics();
  if (!ph) return;
  decorateStoreLinks();
  decoratePricingCtas();
}

boot();
