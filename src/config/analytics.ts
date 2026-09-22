/**
 * PostHog project configuration for irab.app.
 *
 * The project token is a PUBLIC write-only key (same class as the Firebase
 * web config and the Cloudflare beacon token above it in BaseLayout): it can
 * only ingest events. Leave it empty and every analytics call is a no-op.
 *
 * Region: EU (Frankfurt), owner decision 2026-09-22. `POSTHOG_HOST` is the
 * first-party reverse proxy (Cloudflare Worker, irabapp repo
 * cloudflare-workers/posthog-proxy) so ad blockers and carrier DNS filters
 * do not drop events. Until that Worker is live, point it at
 * https://eu.i.posthog.com.
 */
export const POSTHOG_TOKEN = 'phc_zXg4pvCVMjgcFW8VkDcZoKsNEK6U5B3mHumYD3qwocRZ'; // EU project 280831
export const POSTHOG_HOST = 'https://e.irab.app'; // first-party proxy Worker, live 2026-09-22
export const POSTHOG_UI_HOST = 'https://eu.posthog.com';

/** Bump when the notice copy changes materially, so it shows once more. */
export const ANALYTICS_NOTICE_VERSION = 1;

/** Team accounts (Firebase uids): flagged $internal_or_test_user on identify. */
export const INTERNAL_UIDS = new Set<string>([
  'wr9ccBth6sR62c9UXQ6QMT6nnjn2', // owner, primary
  'mqNmPfMSGYSBEG0ppvu3i3EkiVq1', // owner, second test account
]);
