'use client';
import { useRef, useState } from 'react';
import { sfx } from '@/lib/sound';

// Karte zum Hochziehen: Das Geheimnis liegt darunter und ist nur sichtbar, solange man die Karte festhält.
// Loslassen → Karte fällt sofort zurück. So sieht niemand beim zufälligen Draufschauen etwas.
export default function RevealCard({ cover, secret, onRevealed, height = 380 }) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const revealed = useRef(false);
  const max = Math.round(height * 0.62);

  const down = (e) => {
    start.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (start.current == null) return;
    const d = Math.max(0, Math.min(max, start.current - e.clientY));
    setDy(d);
    if (d > max * 0.7 && !revealed.current) {
      revealed.current = true;
      sfx.pop();
      onRevealed && onRevealed();
    }
  };
  const up = () => {
    start.current = null;
    setDragging(false);
    setDy(0);
  };

  return (
    <div className="reveal" style={{ height }}>
      <div className="reveal-secret" style={{ height: max }}>{secret}</div>
      <div
        className={'reveal-cover' + (dragging ? ' drag' : '')}
        style={{ transform: `translateY(${-dy}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onContextMenu={(e) => e.preventDefault()}
      >
        {cover}
        <div className="reveal-grip">
          <div className="reveal-arrow">⬆</div>
          <b>Hochziehen &amp; festhalten</b>
          <span className="muted">Loslassen = wieder zu</span>
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
