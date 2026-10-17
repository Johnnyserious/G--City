'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx, haptic } from '@/lib/sound';
import { recordEmoji, topEmojis } from '@/lib/emojiUse';

// Alle Emojis bis Version 15.1 (läuft ab iOS 17.4 überall; Emoji 16 erst ab iOS 18.4 – sonst leere Kästchen). Daten werden erst beim Öffnen geladen (/emoji.json).
// Auf dem iPhone sehen sie automatisch aus wie bei iOS, weil das Handy seine eigene Emoji-Schrift nutzt.
let cache = null;
const load = () => (cache ||= fetch('/emoji.json').then((r) => r.json()).catch(() => { cache = null; return []; }));

export default function EmojiPicker({ onPick, onClose, title = 'Emojis' }) {
  const [groups, setGroups] = useState(null);
  const [tab, setTab] = useState(-1); // -1 = meine
  const [q, setQ] = useState('');
  const gridRef = useRef(null);
  useEffect(() => { load().then(setGroups); }, []);
  useEffect(() => { if (gridRef.current) gridRef.current.scrollTop = 0; }, [tab, q]);

  const mine = topEmojis(24);
  const list = useMemo(() => {
    if (!groups) return [];
    const s = q.trim().toLowerCase();
    if (s) return groups.flatMap((g) => g.e).filter(([, l]) => l.includes(s)).map(([e]) => e).slice(0, 200);
    if (tab === -1) return mine;
    return groups[tab]?.e.map(([e]) => e) || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, tab, q]);

  const pick = (e) => {
    recordEmoji(e);
    sfx.pop();
    haptic('tap');
    onPick(e);
  };

  return (
    <div className="overlay sheet-overlay" onClick={onClose}>
      <div className="sheet emoji-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="row between" style={{ marginBottom: 8 }}>
          <b className="display" style={{ fontSize: 22 }}>{title}</b>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <input className="input" placeholder="Suchen, z. B. Herz, lachen, Pizza …" value={q} onChange={(e) => setQ(e.target.value)} />
        {!q && (
          <div className="emoji-tabs">
            <button className={tab === -1 ? 'on' : ''} onClick={() => setTab(-1)} aria-label="Meine">🕘</button>
            {(groups || []).map((g, i) => (
              <button key={g.n} className={tab === i ? 'on' : ''} onClick={() => { haptic('tap'); setTab(i); }} aria-label={g.n}>{g.i}</button>
            ))}
          </div>
        )}
        <div className="emoji-label">{q ? 'Suchergebnis' : tab === -1 ? 'Deine Emojis' : groups?.[tab]?.n}</div>
        <div className="emoji-grid" ref={gridRef}>
          {!groups && <div className="muted" style={{ gridColumn: '1 / -1', fontWeight: 700 }}>Lade Emojis …</div>}
          {list.map((e) => (
            <button key={e} onClick={() => pick(e)}>{e}</button>
          ))}
          {groups && !list.length && <div className="muted" style={{ gridColumn: '1 / -1', fontWeight: 700 }}>Nichts gefunden.</div>}
        </div>
      </div>
    </div>
  );
}
