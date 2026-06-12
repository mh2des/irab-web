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
      });
    },
  });
});

// Refresh on font load to avoid layout-shift jitter
document.fonts?.ready?.then(() => ScrollTrigger.refresh());
