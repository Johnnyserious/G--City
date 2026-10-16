'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/sound';

// Zeichenfläche. Der Zeichner schickt seine Striche alle ~70 ms per Broadcast an alle,
// die anderen malen sie nach. Koordinaten sind relativ (0–1), damit es auf jedem Handy passt.
export const COLORS = ['#111111', '#7a7a7a', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ec407a', '#6d4c41'];
const SIZES = [0.008, 0.018, 0.04];
const ERASER = '#ffffff';
const ratio = 0.75; // Höhe / Breite

export default function DrawCanvas({ room, turnId, editable }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const strokes = useRef([]); // { id, c, w, p: [x, y, x, y, …] }
  const turnRef = useRef(turnId);
  const pending = useRef(new Map()); // noch nicht gesendete Punkte
  const current = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(1);
  const [eraser, setEraser] = useState(false);
  const [, force] = useState(0);
  const { sendDraw, subscribeDraw } = room;

  // ---------- Zeichnen ----------
  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes.current) {
      const p = s.p;
      if (p.length < 2) continue;
      ctx.strokeStyle = s.c;
      ctx.fillStyle = s.c;
      ctx.lineWidth = s.w * W;
      if (p.length === 2) {
        ctx.beginPath();
        ctx.arc(p[0] * W, p[1] * H, (s.w * W) / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(p[0] * W, p[1] * H);
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = ((p[i] + p[i + 2]) / 2) * W;
        const my = ((p[i + 1] + p[i + 3]) / 2) * H;
        ctx.quadraticCurveTo(p[i] * W, p[i + 1] * H, mx, my);
      }
      ctx.lineTo(p[p.length - 2] * W, p[p.length - 1] * H);
      ctx.stroke();
    }
  }, []);

  const frame = useRef(0);
  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => { frame.current = 0; redraw(); });
  }, [redraw]);

  // Größe an den Bildschirm anpassen
  useEffect(() => {
    const fit = () => {
      const cv = canvasRef.current;
      const wrap = wrapRef.current;
      if (!cv || !wrap) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      cv.style.width = w + 'px';
      cv.style.height = w * ratio + 'px';
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * ratio * dpr);
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // Neuer Zug → leere Fläche, bei Bedarf Bild vom Zeichner anfordern
  useEffect(() => {
    turnRef.current = turnId;
    strokes.current = [];
    pending.current.clear();
    current.current = null;
    schedule();
    if (!editable) sendDraw({ t: turnId, op: 'need' });
  }, [turnId, editable, sendDraw, schedule]);

  // ---------- Empfangen ----------
  useEffect(() => {
    return subscribeDraw((m) => {
      if (m.t !== turnRef.current) return;
      if (m.op === 'need') {
        if (editable) sendDraw({ t: turnRef.current, op: 'sync', strokes: strokes.current });
        return;
      }
      if (editable) return; // eigene Striche hat der Zeichner schon
      if (m.op === 'pts') {
        let s = strokes.current.find((x) => x.id === m.id);
        if (!s) { s = { id: m.id, c: m.c, w: m.w, p: [] }; strokes.current.push(s); }
        s.p.push(...m.p);
      } else if (m.op === 'undo') {
        strokes.current = strokes.current.filter((x) => x.id !== m.id);
      } else if (m.op === 'clear') {
        strokes.current = [];
      } else if (m.op === 'sync') {
        if (Array.isArray(m.strokes) && m.strokes.length >= strokes.current.length) strokes.current = m.strokes;
      }
      schedule();
    });
  }, [subscribeDraw, sendDraw, editable, schedule]);

  // ---------- Senden (nur Zeichner) ----------
  useEffect(() => {
    if (!editable) return;
    const t = setInterval(() => {
      if (!pending.current.size) return;
      for (const [id, x] of pending.current) sendDraw({ t: turnRef.current, op: 'pts', id, c: x.c, w: x.w, p: x.p });
      pending.current.clear();
    }, 70);
    return () => clearInterval(t);
  }, [editable, sendDraw]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  };
  const addPts = (s, pts) => {
    s.p.push(...pts);
    const q = pending.current.get(s.id) || { c: s.c, w: s.w, p: [] };
    q.p.push(...pts);
    pending.current.set(s.id, q);
  };

  const down = (e) => {
    if (!editable) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const s = { id: Math.random().toString(36).slice(2, 8), c: eraser ? ERASER : color, w: SIZES[size] * (eraser ? 2 : 1), p: [] };
    strokes.current.push(s);
    current.current = s;
    addPts(s, pos(e));
    schedule();
  };
  const move = (e) => {
    const s = current.current;
    if (!s) return;
    const [x, y] = pos(e);
    const n = s.p.length;
    if (Math.abs(s.p[n - 2] - x) + Math.abs(s.p[n - 1] - y) < 0.004) return;
    addPts(s, [x, y]);
    schedule();
  };
  const up = () => { current.current = null; };

  const undo = () => {
    const s = strokes.current.pop();
    if (!s) return;
    sfx.click();
    pending.current.delete(s.id);
    sendDraw({ t: turnRef.current, op: 'undo', id: s.id });
    schedule();
    force((x) => x + 1);
  };
  const clear = () => {
    if (!strokes.current.length) return;
    sfx.pop();
    strokes.current = [];
    pending.current.clear();
    sendDraw({ t: turnRef.current, op: 'clear' });
    schedule();
  };

  return (
    <div className="draw-wrap">
      <div ref={wrapRef} className="draw-canvas-box">
        <canvas
          ref={canvasRef}
          className={'draw-canvas' + (editable ? ' editable' : '')}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
      </div>
      {editable && (
        <div className="draw-tools">
          <div className="draw-colors">
            {COLORS.map((c) => (
              <button key={c} className={'draw-color' + (!eraser && color === c ? ' on' : '')} style={{ background: c }} onClick={() => { setColor(c); setEraser(false); }} aria-label="Farbe" />
            ))}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {SIZES.map((w, i) => (
              <button key={w} className={'draw-tool' + (size === i ? ' on' : '')} onClick={() => setSize(i)} aria-label="Stiftgröße">
                <span style={{ width: 6 + i * 7, height: 6 + i * 7, borderRadius: 99, background: 'currentColor', display: 'block' }} />
              </button>
            ))}
            <button className={'draw-tool' + (eraser ? ' on' : '')} onClick={() => setEraser(!eraser)} aria-label="Radierer">🧽</button>
            <button className="draw-tool" onClick={undo} aria-label="Rückgängig">↩️</button>
            <button className="draw-tool" onClick={clear} aria-label="Alles löschen">🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
}
