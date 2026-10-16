'use client';
// Alle Sounds werden live im Browser erzeugt – keine Dateien nötig.
let ctx = null;
let muted = false;
if (typeof window !== 'undefined') {
  try { muted = localStorage.getItem('qa_muted') === '1'; } catch {}
}
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('qa_muted', m ? '1' : '0'); } catch {}
}
function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
export const sfx = {
  click: () => tone(660, 0, 0.07, 'triangle', 0.12),
  pop: () => { tone(520, 0, 0.08, 'sine', 0.2, 900); },
  join: () => { tone(523, 0, 0.1, 'triangle'); tone(784, 0.08, 0.14, 'triangle'); },
  pick: () => { tone(300, 0, 0.25, 'sawtooth', 0.08, 900); tone(900, 0.2, 0.12, 'triangle', 0.15); },
  tick: () => tone(1200, 0, 0.04, 'square', 0.06),
  correct: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.2)); tone(1568, 0.38, 0.4, 'sine', 0.12); },
  wrong: () => { tone(330, 0, 0.22, 'sawtooth', 0.1, 220); tone(220, 0.2, 0.4, 'sawtooth', 0.1, 140); },
  joker: () => { [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.15, 'sine', 0.14)); },
  vote: () => tone(740, 0, 0.09, 'triangle', 0.14, 990),
  fanfare: () => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.18)); },
  chat: () => tone(1046, 0, 0.06, 'sine', 0.08),
};
