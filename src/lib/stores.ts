/**
 * App Store links carry a campaign token so App Store Connect › Analytics ›
 * Campaigns can count the installs each placement brings. A `ppid` opens one
 * of the app's custom product pages instead of the default listing (until
 * Apple approves that page, the store just shows the default one).
 */
const APP_STORE = 'https://apps.apple.com/app/apple-store/id6765811277';
const PROVIDER_TOKEN = '128779703';

export const QURAN_PRODUCT_PAGE = '02fd5241-166d-4771-bc68-ca7ad98208f8';

export function appStoreUrl(campaign: string, productPage?: string): string {
  const url = `${APP_STORE}?pt=${PROVIDER_TOKEN}&ct=${campaign}&mt=8`;
  return productPage ? `${url}&ppid=${productPage}` : url;
}
