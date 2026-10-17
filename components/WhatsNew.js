'use client';
import { useEffect, useState } from 'react';
import { LATEST } from '@/lib/changelog';
import { sfx, haptic } from '@/lib/sound';
import { store } from '@/lib/player';

const KEY = 'gcity_seen_changelog';

// Nach einem Update: kurze Einführung „Das ist neu“, ein Punkt pro Bildschirm.
// Ganz neue Nutzer (noch nie etwas gesehen, kein Profil) bekommen es nicht – für die ist alles neu.
export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    try {
      const seen = localStorage.getItem(KEY);
      if (seen === LATEST.id) return;
      const prof = JSON.parse(store().getItem('qa_profile') || 'null');
      if (!seen && !prof) { localStorage.setItem(KEY, LATEST.id); return; } // ganz neu: für die ist alles neu
      if (!prof || (!prof.registered && !prof.setupSeen)) return; // erst Profil anlegen, dann zeigen
      setOpen(true);
    } catch {}
  }, []);
  if (!open) return null;
  const items = LATEST.items;
  const it = items[i];
  const last = i === items.length - 1;
  const close = () => {
    try { localStorage.setItem(KEY, LATEST.id); } catch {}
    setOpen(false);
  };
  const next = () => {
    haptic('tap');
    if (last) { sfx.fanfare(); close(); } else { sfx.pop(); setI(i + 1); }
  };
  return (
    <div className="whatsnew" role="dialog" aria-label="Das ist neu">
      <div className="whatsnew-card">
        <div className="row between">
          <span className="whatsnew-head">✨ Das ist neu</span>
          <button className="icon-btn small" onClick={close} aria-label="Schließen">✕</button>
        </div>
        <div className="whatsnew-slide" key={i} onClick={next}>
          <div className="wn-emoji">{it.emoji}</div>
          <h2>{it.title}</h2>
          <p>{it.text}</p>
        </div>
        <div className="wn-dots">{items.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="row" style={{ gap: 8 }}>
          {i > 0 && <button className="btn ghost" onClick={() => { haptic('tap'); setI(i - 1); }}>‹</button>}
          <button className="btn big full pink" onClick={next}>{last ? "Los geht's 🚀" : 'Weiter ›'}</button>
        </div>
      </div>
    </div>
  );
}
