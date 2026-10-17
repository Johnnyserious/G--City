'use client';
import { useEffect, useRef, useState } from 'react';

// Meme-Vorlage mit frei platzierten Textfeldern im klassischen Meme-Stil (Schrift Anton).
// boxes: [{ x, y, size, text }] – x/y = Mitte des Felds, 0–1 relativ zum Bild.
// Alte Memes mit top/bottom werden weiter angezeigt.
const fontSize = (t, size = 1) => {
  const n = (t || '').length;
  return Math.max(3.6, 8.5 - n / 12) * size + 'cqw';
};

// Damit Text am Rand nicht abgeschnitten wird: Feld höchstens so breit, wie Platz bis zum Rand ist
const boxWidth = (x) => Math.max(34, Math.min(94, 2 * Math.min(x, 1 - x) * 100 - 2));

// Mitte des Felds liegt bei x/y. Ohne CSS-transform (stabiler beim Neuzeichnen):
// Feld hat Höhe 0 und zentriert den Text darin senkrecht.
export function BoxText({ box, selected, onPointerDown, editable, i }) {
  const w = boxWidth(box.x);
  const left = Math.max(0, Math.min(100 - w, box.x * 100 - w / 2));
  return (
    <div className="meme-box" style={{ left: left + '%', top: box.y * 100 + '%', width: w + '%' }}>
      <span
        className={'meme-box-t' + (selected ? ' sel' : '') + (editable ? ' edit' : '')}
        style={{ fontSize: fontSize(box.text, box.size) }}
        onPointerDown={onPointerDown}
        data-i={i}
      >
        {box.text || (editable ? <span className="meme-box-ph">Text …</span> : null)}
      </span>
    </div>
  );
}

export default function MemeImage({ tpl, top, bottom, boxes, maxHeight = '62vh', children, handlers, innerRef }) {
  const [broken, setBroken] = useState(false);
  const [natural, setNatural] = useState(null);
  const own = useRef(null);
  useEffect(() => { setBroken(false); setNatural(null); }, [tpl?.url]);
  if (!tpl) return null;
  // Größe: von der Vorlage, sonst aus dem geladenen Bild (manche Vorlagen bringen keine Größe mit)
  const w = tpl.width || natural?.w;
  const h = tpl.height || natural?.h;
  const ratio = w && h ? w / h : 1;
  const list = boxes || [
    ...(top ? [{ x: 0.5, y: 0.1, text: top }] : []),
    ...(bottom ? [{ x: 0.5, y: 0.9, text: bottom }] : []),
  ];
  return (
    <div
      ref={(el) => { own.current = el; if (innerRef) innerRef.current = el; }}
      className="meme"
      style={{ aspectRatio: String(ratio), maxHeight, maxWidth: `calc(${maxHeight} * ${ratio})` }}
      {...handlers}
    >
      {broken ? (
        <div className="meme-broken">🖼️ {tpl.name}<br /><small>Bild lädt nicht – stell es dir vor 😅</small></div>
      ) : (
        <img
          src={tpl.url}
          alt={tpl.name}
          draggable={false}
          onError={() => setBroken(true)}
          onLoad={(e) => !tpl.width && setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          referrerPolicy="no-referrer"
        />
      )}
      {children || list.map((b, i) => <BoxText key={i} box={b} />)}
    </div>
  );
}
