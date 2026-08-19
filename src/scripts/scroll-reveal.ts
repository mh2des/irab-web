/**
 * Scroll-reveal, GSAP-powered entry animations.
 *
 * Any element with [data-reveal] fades up when it enters the viewport.
 * Optional [data-reveal-delay="120"] (ms) to stagger sibling reveals.
 *
 * Restraint: opacity 0→1 + translateY 24→0, 600ms, ease-out-expo.
 * No bounce. No rotate. No bedazzling.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Respect reduced motion
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
  const delay = parseInt(el.dataset.revealDelay ?? '0', 10) / 1000;

  if (prefersReduced) {
    gsap.set(el, { opacity: 1, y: 0 });
    return;
  }

  // Never hide what the visitor can already see. This script loads after the
  // HTML has painted, so setting opacity:0 on in-viewport elements un-renders
  // the hero and re-reveals it ~1s later — Lighthouse measured the homepage
  // LCP at 5.2s with 3.3s of pure render delay from exactly this. Elements
  // already on screen keep their server-rendered paint; everything below the
  // fold still gets the scroll-in entrance.
  const r = el.getBoundingClientRect();
  const inView = r.top < window.innerHeight * 0.88 && r.bottom > 0;
  if (inView) return;

  gsap.set(el, { opacity: 0, y: 24 });
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    once: true,
    onEnter: () => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay,
        ease: 'expo.out',
        clearProps: 'transform',
      });
    },
  });
});

// Refresh on font load to avoid layout-shift jitter
document.fonts?.ready?.then(() => ScrollTrigger.refresh());
