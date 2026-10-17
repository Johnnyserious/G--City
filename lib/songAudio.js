'use client';
// Hörproben im Browser: laden, dekodieren, lauteste Stelle (Refrain/Hook) finden, Ausschnitte abspielen.
// Abspielen muss in einem Tipp passieren (iPhone erlaubt Ton sonst nicht).
let ctx = null;
const cache = new Map(); // url -> Promise<{ buf, hook }>
let current = null;

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    // iPhone: Ton auch, wenn der Lautlos-Schalter an ist (Safari 17+)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  }
  return ctx;
}

// Startpunkt des Ausschnitts: die erste Stelle, an der der Song richtig „aufdreht“ (meist Hook/Refrain).
// Es müssen danach noch 15 s übrig bleiben.
function findHook(buf) {
  const data = buf.getChannelData(0);
  const win = Math.floor(buf.sampleRate * 0.5);
  const rms = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j += 4) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / (win / 4)));
  }
  const maxStart = Math.max(0, buf.duration - 15.3);
  const usable = rms.slice(0, Math.floor(maxStart / 0.5) + 1);
  if (!usable.length) return 0;
  const max = Math.max(...rms);
  // Zwei laute Fenster hintereinander, damit kein einzelner Knall zählt
  for (let k = 0; k < usable.length; k++) {
    if (usable[k] >= max * 0.75 && (rms[k + 1] || 0) >= max * 0.6) return Math.min(maxStart, k * 0.5);
  }
  return Math.min(maxStart, usable.indexOf(Math.max(...usable)) * 0.5);
}

export function loadSong(url) {
  if (!url) return Promise.reject(new Error('Keine Hörprobe'));
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error('Hörprobe nicht verfügbar'); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => audioCtx().decodeAudioData(ab, res, rej)))
      .then((buf) => ({ buf, hook: findHook(buf) }));
    p.catch(() => cache.delete(url));
    cache.set(url, p);
    if (cache.size > 30) cache.delete(cache.keys().next().value);
  }
  return cache.get(url);
}

export function stopSong() {
  if (current) {
    try { current.src.stop(); } catch {}
    current = null;
  }
}

// Spielt `dur` Sekunden ab `from` (null = Hook). onEnd wird am Ende aufgerufen.
export async function playSong(url, { dur, from = null, onEnd } = {}) {
  const c = audioCtx();
  if (c.state === 'suspended') c.resume();
  stopSong();
  const { buf, hook } = await loadSong(url);
  const start = from == null ? hook : from;
  const length = Math.min(dur || buf.duration, buf.duration - start);
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  const t0 = c.currentTime + 0.02;
  const fade = Math.min(0.03, length / 4);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(1, t0 + fade);
  gain.gain.setValueAtTime(1, t0 + length - fade);
  gain.gain.linearRampToValueAtTime(0, t0 + length);
  src.connect(gain).connect(c.destination);
  src.start(t0, start, length);
  const me = { src, startedAt: t0, length };
  current = me;
  src.onended = () => { if (current === me) current = null; onEnd && onEnd(); };
  return { length, startedAt: t0, ctx: c };
}

export const songDuration = async (url) => (await loadSong(url)).buf.duration;
