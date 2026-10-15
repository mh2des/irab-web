/**
 * Stage sound, synthesised in the browser (no audio files, nothing to
 * license). Shares the site's mute flag with lib/celebrate.ts. Browsers only
 * play after a click, so the first host interaction unlocks it.
 *
 * The lobby loop walks a Hijaz scale on D (D E♭ F♯ G A B♭ C D): calm, and
 * unmistakably ours.
 */
import { isMuted, setMuted } from '../../celebrate';

let ctx: AudioContext | null = null;
let loopTimer: number | undefined;
const HJ = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33];

function audio(): AudioContext | null {
  if (isMuted()) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

// Until a click lets audio start, the context is suspended and its clock is
// frozen: anything scheduled then would all fire at once later. Drop it.
const running = (c: AudioContext | null): c is AudioContext => !!c && c.state === 'running';

function tone(f: number, at: number, dur: number, type: OscillatorType = 'sine', g = 0.08) {
  const c = audio(); if (!running(c)) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(); const gn = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(g, t0 + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(at: number, dur: number, g = 0.05, freq = 1200) {
  const c = audio(); if (!running(c)) return;
  const t0 = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const gn = c.createGain(); gn.gain.value = g;
  src.connect(f); f.connect(gn); gn.connect(c.destination); src.start(t0);
}

export const cue = {
  join() { tone(HJ[4] * 2, 0, 0.09, 'triangle', 0.05); tone(HJ[7] * 2, 0.06, 0.12, 'triangle', 0.04); },
  tick() { tone(1046, 0, 0.05, 'square', 0.025); },
  answer() { tone(880, 0, 0.05, 'sine', 0.025); },
  read() { tone(HJ[0], 0, 1.4, 'sine', 0.03); tone(HJ[4], 0.05, 1.4, 'sine', 0.022); },
  go() { tone(HJ[4] * 2, 0, 0.12, 'triangle', 0.07); tone(HJ[7] * 2, 0.08, 0.18, 'triangle', 0.06); },
  timeup() { tone(HJ[2], 0, 0.25, 'triangle', 0.06); tone(HJ[0], 0.18, 0.4, 'triangle', 0.06); },
  reveal() { tone(HJ[0] * 2, 0, 0.14, 'triangle', 0.07); tone(HJ[2] * 2, 0.09, 0.14, 'triangle', 0.07); tone(HJ[4] * 2, 0.18, 0.3, 'triangle', 0.07); },
  whoosh() { noise(0, 0.35, 0.05, 900); noise(0.05, 0.3, 0.035, 2400); },
  fanfare() {
    for (let i = 0; i < 16; i++) noise(i * (0.11 - i * 0.004), 0.06, 0.06, 300);
    [HJ[0], HJ[2], HJ[4], HJ[7]].forEach((f, i) => { tone(f, 1.35 + i * 0.12, 0.35, 'triangle', 0.08); tone(f * 2, 1.35 + i * 0.12, 0.3, 'sine', 0.035); });
  },
};

export function startLobbyLoop(): void {
  stopLobbyLoop();
  if (isMuted()) return;
  const pat = [0, 2, 4, 3, 2, 1, 0, 4, 5, 4, 2, 3, 2, 1, 2, 0];
  let i = 0;
  loopTimer = window.setInterval(() => {
    const n = pat[i % pat.length];
    tone(HJ[n], 0, 0.42, 'triangle', 0.03);
    if (i % 4 === 0) tone(HJ[0] / 2, 0, 0.6, 'sine', 0.035);
    i++;
  }, 320);
}

export function stopLobbyLoop(): void {
  if (loopTimer) { clearInterval(loopTimer); loopTimer = undefined; }
}

export const soundOn = () => !isMuted();
export function setSound(on: boolean): void {
  setMuted(!on);
  if (!on) stopLobbyLoop();
  else audio();
}
