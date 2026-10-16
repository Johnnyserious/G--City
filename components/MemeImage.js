'use client';
import { useState } from 'react';

// Meme-Vorlage mit Text oben und unten im klassischen Meme-Stil
const size = (t) => {
  const n = (t || '').length;
  return Math.max(4.2, 9 - n / 11) + 'cqw';
};

export default function MemeImage({ tpl, top, bottom, maxHeight = '62vh' }) {
  const [broken, setBroken] = useState(false);
  if (!tpl) return null;
  const ratio = tpl.width && tpl.height ? tpl.width / tpl.height : 1;
  return (
    <div className="meme" style={{ aspectRatio: String(ratio), maxHeight, maxWidth: `calc(${maxHeight} * ${ratio})` }}>
      {broken ? (
        <div className="meme-broken">🖼️ {tpl.name}<br /><small>Bild lädt nicht – stell es dir vor 😅</small></div>
      ) : (
        <img src={tpl.url} alt={tpl.name} draggable={false} onError={() => setBroken(true)} referrerPolicy="no-referrer" />
      )}
      {top && <div className="meme-text top" style={{ fontSize: size(top) }}>{top}</div>}
      {bottom && <div className="meme-text bottom" style={{ fontSize: size(bottom) }}>{bottom}</div>}
    </div>
  );
}
