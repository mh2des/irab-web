/**
 * ui-fx — site-wide pointer micro-interactions (unlumen UI ports, vanilla).
 *
 *   [data-magnetic]      the element is pulled toward the pointer inside a
 *                        proximity radius and springs back on exit
 *   [data-tilt]          3D press-tilt that follows the pointer over the
 *                        element; the number value overrides the max degrees
 *   details[data-acc]    accordion motion for native <details>: animated
 *                        height + content slide, single-open inside a
 *                        [data-acc-group]. Falls back to instant native
 *                        toggling without JS or under reduced motion.
 *
 * Loaded once per page from BaseLayout. Fine pointers only, and everything
 * no-ops under prefers-reduced-motion. Effects write the CSS `translate`
 * property (magnetic) or inline `transform` (tilt) and clean up after
 * themselves so stylesheet hover states take back over at rest.
 */

type Axis = { x: number; v: number };
const axis = (): Axis => ({ x: 0, v: 0 });

/** Semi-implicit Euler spring; 8ms substeps keep stiff springs stable. */
function step(a: Axis, target: number, k: number, d: number, m: number, dt: number) {
  while (dt > 0) {
    const h = Math.min(dt, 0.008);
    a.v += ((-k * (a.x - target) - d * a.v) / m) * h;
    a.x += a.v * h;
    dt -= h;
  }
}
const settled = (a: Axis, target = 0) =>
  Math.abs(a.x - target) < 0.05 && Math.abs(a.v) < 0.05;

function initMagnetic() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-magnetic]')];
  if (!els.length) return;
  // unlumen magnetic-button defaults: pull = (1 - dist/radius) * strength,
  // spring stiffness 150 / damping 15 / mass 0.1.
  const K = 150, D = 15, M = 0.1, STRENGTH = 0.4, REACH = 90;
  const st = els.map((el) => ({ el, ax: axis(), ay: axis(), tx: 0, ty: 0 }));
  let raf = 0;
  let last = 0;

  const loop = (t: number) => {
    const dt = Math.min((t - last) / 1000, 0.032);
    last = t;
    let busy = false;
    for (const s of st) {
      step(s.ax, s.tx, K, D, M, dt);
      step(s.ay, s.ty, K, D, M, dt);
      if (s.tx === 0 && s.ty === 0 && settled(s.ax) && settled(s.ay)) {
        s.ax = axis(); s.ay = axis();
        s.el.style.removeProperty('translate');
      } else {
        busy = true;
        s.el.style.setProperty('translate', `${s.ax.x.toFixed(2)}px ${s.ay.x.toFixed(2)}px`);
      }
    }
    raf = busy ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };

  window.addEventListener('pointermove', (e) => {
    for (const s of st) {
      const r = s.el.getBoundingClientRect();
      if (!r.width) { s.tx = 0; s.ty = 0; continue; }
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const radius = Math.max(r.width, r.height) / 2 + REACH;
      const dist = Math.hypot(dx, dy);
      const pull = dist < radius ? (1 - dist / radius) * STRENGTH : 0;
      s.tx = dx * pull;
      s.ty = dy * pull;
    }
    kick();
  }, { passive: true });
}

function initTilt() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-tilt]')];
  if (!els.length) return;
  const K = 220, D = 18, M = 0.6, LIFT = -7;
  for (const el of els) {
    const max = Number(el.dataset.tilt) || 6;
    const rx = axis(), ry = axis(), lift = axis();
    let trx = 0, tryy = 0, tlift = 0, raf = 0, last = 0, over = false;

    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.032);
      last = t;
      step(rx, trx, K, D, M, dt);
      step(ry, tryy, K, D, M, dt);
      step(lift, tlift, K, D, M, dt);
      if (!over && settled(rx) && settled(ry) && settled(lift)) {
        el.style.removeProperty('transform');
        el.style.removeProperty('transition-property');
        raf = 0;
        return;
      }
      el.style.transform =
        `perspective(1000px) rotateX(${rx.x.toFixed(2)}deg) rotateY(${ry.x.toFixed(2)}deg) translate3d(0, ${lift.x.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };

    el.addEventListener('pointerenter', () => {
      over = true;
      tlift = LIFT;
      // Keep shadow/border transitions but stop the stylesheet's transform
      // transition from smearing the per-frame spring updates.
      el.style.setProperty('transition-property', 'box-shadow, border-color, background-color');
      kick();
    });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      trx = -ny * 2 * max; // press-style: the hovered edge dips away
      tryy = nx * 2 * max;
      kick();
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      over = false;
      trx = 0; tryy = 0; tlift = 0;
      kick();
    });
  }
}

function initAccordion() {
  const items = [...document.querySelectorAll<HTMLDetailsElement>('details[data-acc]')];
  if (!items.length) return;
  // quart-out ≈ the original's near-critically-damped height spring (340/34/.9).
  // Open and close share ONE duration so a single-open swap (one item closing
  // while another opens) shifts the list uniformly instead of in two steps.
  const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';
  const MS = 380;
  const running = new WeakMap<HTMLElement, Animation>();
  const panelOf = (det: HTMLDetailsElement) =>
    det.querySelector<HTMLElement>(':scope > *:not(summary)');

  // The panel owns its padding (pb-6), and with border-box sizing an animated
  // height can never shrink below the padding — leaving ~24px that snaps shut
  // when [open] is removed. So padding animates together with height, and the
  // "from" state is sampled from the live animated values before cancelling.
  const openDet = (det: HTMLDetailsElement) => {
    const panel = panelOf(det);
    det.classList.add('acc-open');
    if (!panel) { det.open = true; return; }
    const wasOpen = det.open;
    const live = getComputedStyle(panel);
    const from = wasOpen
      ? { height: `${panel.getBoundingClientRect().height}px`, paddingTop: live.paddingTop, paddingBottom: live.paddingBottom, opacity: live.opacity }
      : { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: '0' };
    running.get(det)?.cancel();
    det.open = true;
    const rest = getComputedStyle(panel);
    const to = { height: `${panel.scrollHeight}px`, paddingTop: rest.paddingTop, paddingBottom: rest.paddingBottom, opacity: '1' };
    panel.style.overflow = 'hidden';
    const a = panel.animate([from, to], { duration: MS, easing: EASE });
    a.onfinish = () => { panel.style.removeProperty('overflow'); };
    running.set(det, a);
    if (!wasOpen) {
      panel.firstElementChild?.animate(
        [{ transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }],
        { duration: MS, easing: EASE },
      );
    }
  };

  const closeDet = (det: HTMLDetailsElement) => {
    const panel = panelOf(det);
    det.classList.remove('acc-open');
    if (!panel) { det.open = false; return; }
    const live = getComputedStyle(panel);
    const from = { height: `${panel.getBoundingClientRect().height}px`, paddingTop: live.paddingTop, paddingBottom: live.paddingBottom, opacity: live.opacity };
    running.get(det)?.cancel();
    panel.style.overflow = 'hidden';
    const a = panel.animate(
      [from, { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: '0' }],
      { duration: MS, easing: EASE, fill: 'forwards' },
    );
    a.onfinish = () => {
      det.open = false;
      panel.style.removeProperty('overflow');
      a.cancel();
    };
    running.set(det, a);
    panel.firstElementChild?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }],
      { duration: MS, easing: EASE },
    );
  };

  for (const det of items) {
    det.classList.add('acc-on');
    if (det.open) det.classList.add('acc-open');
    det.querySelector(':scope > summary')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (det.classList.contains('acc-open')) {
        closeDet(det);
      } else {
        det.closest('[data-acc-group]')
          ?.querySelectorAll<HTMLDetailsElement>('details[data-acc].acc-open')
          .forEach((other) => { if (other !== det) closeDet(other); });
        openDet(det);
      }
    });
  }
}

const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!noMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  initMagnetic();
  initTilt();
}
if (!noMotion) initAccordion();
