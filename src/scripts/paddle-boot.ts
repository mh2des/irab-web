/**
 * Runs once per page after window.load (imported from BaseLayout). Loads
 * Paddle.js only where Paddle itself sends people:
 *   1. a Paddle payment link (?_ptxn=txn_…) on any page: once initialised,
 *      Paddle.js opens the payment form for that transaction by itself. Paddle
 *      builds these for card updates and invoices on the default payment link
 *      (irab.app/app); until now no page loaded Paddle.js for them.
 *   2. the home pages: Paddle Retain's recovery emails bring customers here
 *      to update their card in one click (Retain > Paddle.js setup).
 * Signed-in web buyers are handled in lib/paddle-retain.ts.
 */
const isHome = /^\/(en\/?)?$/.test(location.pathname);
const isPaymentLink = new URLSearchParams(location.search).has('_ptxn');

if (isHome || isPaymentLink) {
  import('../lib/paddle')
    .then((m) => m.loadPaddle())
    .catch(() => { /* blocked or offline: checkout buttons retry on click */ });
}

export {}; // a module, for BaseLayout's dynamic import
