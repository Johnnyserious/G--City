'use client';
import { useRef, useState } from 'react';
import { sfx } from '@/lib/sound';

// Karte mit Geheimnis darunter.
// Antippen (oder hochziehen) → Karte bleibt offen, man sieht das Wort die ganze Zeit.
// Nochmal antippen → Karte ist wieder zu.
// Damit man nicht ständig auf- und zumacht: kurze Sperre nach jedem Umschalten und
// optional eine Höchstzahl, wie oft man öffnen darf (maxOpens, z. B. auf einem gemeinsamen Handy).
export default function RevealCard({ cover, secret, onRevealed, height = 380, maxOpens = Infinity }) {
  const [open, setOpen] = useState(false);
  const [opens, setOpens] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const moved = useRef(false);
  const lockUntil = useRef(0);
  const revealed = useRef(false);
  const max = Math.round(height * 0.62);
  const left = maxOpens - opens;
  const canOpen = left > 0;

  const setState = (next) => {
    if (Date.now() < lockUntil.current) return;
    if (next && !canOpen) return;
    lockUntil.current = Date.now() + 800;
    setOpen(next);
    sfx.pop();
    if (next) {
      setOpens((n) => n + 1);
      if (!revealed.current) { revealed.current = true; onRevealed && onRevealed(); }
    }
  };

  const down = (e) => {
    start.current = e.clientY;
    moved.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (start.current == null || open) return;
    const d = Math.max(0, Math.min(max, start.current - e.clientY));
    if (d > 8) moved.current = true;
    if (canOpen) setDy(d);
  };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    setDragging(false);
    // Antippen schaltet um, Hochziehen über die Hälfte öffnet
    if (open) setState(false);
    else if (!moved.current || dy > max * 0.4) setState(true);
    setDy(0);
  };

  const offset = open ? max : dy;
  return (
    <div className="reveal" style={{ height }}>
      <div className="reveal-secret" style={{ height: max }}>{secret}</div>
      <div
        className={'reveal-cover' + (dragging && !open ? ' drag' : '') + (!open && !canOpen ? ' locked' : '')}
        style={{ transform: `translateY(${-offset}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { start.current = null; setDragging(false); setDy(0); }}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        aria-label={open ? 'Karte zudecken' : 'Karte aufdecken'}
      >
        {cover}
        <div className="reveal-grip">
          {open ? (
            <>
              <b>🙈 Antippen = zudecken</b>
              <span className="muted">Die Karte bleibt offen, bis du sie zumachst</span>
            </>
          ) : canOpen ? (
            <>
              <div className="reveal-arrow">👆</div>
              <b>Antippen zum Aufdecken</b>
              <span className="muted">{Number.isFinite(maxOpens) && opens > 0 ? `Noch ${left}× aufdecken möglich` : 'Andere nicht hingucken lassen'}</span>
            </>
          ) : (
            <>
              <b>🔒 Karte schon angesehen</b>
              <span className="muted">Handy weitergeben</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Inhalt unter der Karte. Lösungswort blau, Tippwort rot.
export function SecretWord({ imposter, word, tip, category }) {
  return (
    <div className="secret-inner">
      <div className="secret-cat">{category}</div>
      {imposter ? (
        <>
          <div className="secret-label red">🤫 Du bist Imposter – dein Tipp:</div>
          <div className="secret-word red">{tip}</div>
        </>
      ) : (
        <>
          <div className="secret-label blue">Dein Wort:</div>
          <div className="secret-word blue">{word}</div>
        </>
      )}
    </div>
  );
}
