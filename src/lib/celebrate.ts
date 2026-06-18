/**
 * celebrate.ts — gamification helpers: sound effects (Web Audio, no asset
 * files), a lightweight canvas confetti burst, and a number count-up.
 * Dependency-free. Sounds respect a localStorage mute flag; confetti/count-up
 * respect prefers-reduced-motion.
 */

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const MUTE_KEY = 'irab-sfx-muted';
export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function setMuted(m: boolean): void {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (isMuted()) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, startAt: number, dur: number, type: OscillatorType = 'sine', gain = 0.12): void {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + startAt;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Short, pleasant interaction sounds. */
export const sfx = {
  tap() { tone(520, 0, 0.06, 'triangle', 0.05); },
  select() { tone(680, 0, 0.09, 'sine', 0.07); tone(910, 0.05, 0.09, 'sine', 0.05); },
  correct() { tone(660, 0, 0.1, 'sine', 0.09); tone(990, 0.08, 0.15, 'sine', 0.09); },
  wrong() { tone(196, 0, 0.2, 'sawtooth', 0.05); },
  /** Celebratory arpeggio; bigger for higher scores. */
  finish(score: number) {
    if (score >= 0.8) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.24, 'triangle', 0.11));
    else if (score >= 0.5) [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.2, 'sine', 0.1));
    else { tone(440, 0, 0.16, 'sine', 0.09); tone(523, 0.1, 0.2, 'sine', 0.09); }
  },
};

/** Count a number element up to `to` (percent by default). */
export function countUp(node: HTMLElement, to: number, ms = 950, suffix = '%'): void {
  if (reduce()) { node.textContent = `${Math.round(to)}${suffix}`; return; }
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = `${Math.round(to * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** A short confetti burst from the upper-middle of the viewport. */
export function confetti(count = 130): void {
  if (reduce() || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:95';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const cx = canvas.getContext('2d');
  if (!cx) { canvas.remove(); return; }
  cx.scale(dpr, dpr);
  const W = window.innerWidth, H = window.innerHeight;
  const colors = ['#7C4DFF', '#1F789B', '#C28A1E', '#C2603C', '#10B981', '#6200EA'];
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 140,
    y: H * 0.36,
    vx: (Math.random() - 0.5) * 10,
    vy: Math.random() * -10 - 4,
    s: 5 + Math.random() * 7,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.35,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let frame = 0;
  const tick = () => {
    frame++;
    cx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.24; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rot);
      cx.globalAlpha = Math.max(0, 1 - frame / 170);
      cx.fillStyle = p.c;
      cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.55);
      cx.restore();
    }
    if (frame < 170) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
