/**
 * PostHog for the website. Browser-only, loaded AFTER window.load from
 * BaseLayout (same rule as the fx bundle: nothing here may touch first paint).
 *
 * Identity model (shared with the app, see irabapp docs/posthog_integration):
 *   - anonymous visitors are an anonymous PostHog person, stored in
 *     localStorage only (no cookies; owner decision 2026-09-22)
 *   - sign-in calls identify(firebaseUid): the same uid RevenueCat, Paddle and
 *     the app use, so web and app land on one person
 *   - the Play badge carries the visitor's distinct id + campaign params in
 *     the store `referrer`; the Android app aliases it on first open
 *
 * Event names are snake_case, object then past-tense verb, flat primitive
 * properties, never the user's text.
 */
import type { PostHog } from 'posthog-js';
import type { User } from 'firebase/auth';
import { INTERNAL_UIDS, POSTHOG_HOST, POSTHOG_TOKEN, POSTHOG_UI_HOST } from '../config/analytics';

type Props = Record<string, string | number | boolean | null | undefined>;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;

/** Events captured before init (e.g. a paywall shown right after paint). */
const pending: Array<[string, Record<string, string | number | boolean>]> = [];
const PENDING_MAX = 20;
/** Auth state seen before init; `undefined` = nothing seen yet. */
let pendingIdentity: User | null | undefined;

/** True when a token is configured; false disables every call cheaply. */
export const analyticsEnabled = POSTHOG_TOKEN.length > 0;

export function pageGroupFor(pathname: string): string {
  const p = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  if (p === '/') return 'landing';
  if (p.startsWith('/quran')) return 'quran';
  if (p.startsWith('/duroos')) return 'duroos';
  if (p.startsWith('/majlis') || p === '/majalis') return 'majlis';
  if (p.startsWith('/irab') || p === '/tool') return 'tool_irab';
  if (p.startsWith('/dictionary')) return 'tool_dictionary';
  if (p.startsWith('/practice')) return 'tool_practice';
  if (p.startsWith('/library')) return 'library';
  if (p === '/pricing') return 'pricing';
  if (p === '/app' || p === '/account' || p === '/history') return 'hub';
  if (p === '/login') return 'auth';
  if (['/privacy', '/terms', '/refund'].includes(p)) return 'legal';
  return 'other';
}

/** Initialise once. Safe to call many times; returns the same promise. */
export function initAnalytics(): Promise<PostHog | null> {
  if (!analyticsEnabled) return Promise.resolve(null);
  if (loading) return loading;
  loading = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_TOKEN, {
      api_host: POSTHOG_HOST,
      ui_host: POSTHOG_UI_HOST,
      // No cookies: identity lives in localStorage on this device only.
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      // Explicit events only; autocapture would triple the event volume on
      // 6,000 Quran pages for little insight.
      autocapture: false,
      respect_dnt: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
      loaded: (ph) => {
        ph.register({
          platform: 'web',
          lang: document.documentElement.lang || 'ar',
          page_group: pageGroupFor(location.pathname),
        });
      },
    });
    client = posthog;
    if (pendingIdentity !== undefined) {
      const u = pendingIdentity;
      pendingIdentity = undefined;
      syncIdentity(u);
    }
    for (const [event, props] of pending.splice(0)) {
      try { posthog.capture(event, props); } catch { /* ignore */ }
    }
    return posthog;
  }).catch(() => null);
  return loading;
}

export function track(event: string, props?: Props): void {
  if (!analyticsEnabled) return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined) continue;
    clean[k] = typeof v === 'string' && v.length > 256 ? v.slice(0, 256) : v;
  }
  if (!client) {
    if (pending.length < PENDING_MAX) pending.push([event, clean]);
    return;
  }
  try { client.capture(event, clean); } catch { /* analytics never breaks the page */ }
}

/** Mirror Firebase auth state onto the PostHog person. */
export function syncIdentity(user: User | null): void {
  // Firebase auth usually resolves before PostHog has loaded (analytics waits
  // for window.load); remember the last state and apply it at init.
  if (!client) { pendingIdentity = user; return; }
  try {
    if (user && !user.isAnonymous) {
      client.identify(user.uid, {
        is_guest: 'false',
        signin_provider: user.providerData[0]?.providerId ?? 'password',
        ...(INTERNAL_UIDS.has(user.uid) ? { $internal_or_test_user: true } : {}),
      });
    } else if (!user) {
      // Firebase uids are 28 url-safe chars with no dashes; PostHog's own
      // anonymous ids are UUID-shaped. Reset only when a uid is bound so an
      // anonymous visitor's first-touch history is never thrown away.
      const id = client.get_distinct_id();
      if (typeof id === 'string' && id.length >= 20 && !id.includes('-')) client.reset();
    }
  } catch { /* ignore */ }
}

export function distinctId(): string | undefined {
  try { return client?.get_distinct_id(); } catch { return undefined; }
}

const CAMPAIGN_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gbraid', 'wbraid', 'gad_source', 'fbclid', 'ttclid', 'sccid', 'msclkid', 'twclid',
] as const;

/**
 * Campaign params for the Play `referrer`: first-touch values from the URL
 * PostHog remembered for this visitor, falling back to the current URL, and
 * finally to a site-organic marker so web-organic installs are measurable
 * too. Always carries `ph_did` so the app can alias the visitor.
 */
export function referrerPayload(): string {
  const params = new URLSearchParams();
  const sources: URLSearchParams[] = [];
  try {
    const info = client?.get_property('$initial_person_info') as { u?: string } | undefined;
    if (info?.u) sources.push(new URL(info.u).searchParams);
  } catch { /* ignore */ }
  sources.push(new URLSearchParams(location.search));
  for (const key of CAMPAIGN_KEYS) {
    for (const s of sources) {
      const v = s.get(key);
      if (v) { params.set(key, v.slice(0, 120)); break; }
    }
  }
  if (!params.has('utm_source')) {
    params.set('utm_source', 'irab.app');
    params.set('utm_medium', 'web');
    params.set('utm_campaign', 'site_organic');
  }
  const did = distinctId();
  if (did) params.set('ph_did', did);
  return params.toString();
}

export function optOut(): void {
  try { client?.opt_out_capturing(); } catch { /* ignore */ }
}

export function hasOptedOut(): boolean {
  try { return client?.has_opted_out_capturing() ?? false; } catch { return false; }
}
