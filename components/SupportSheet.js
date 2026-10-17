'use client';
import { useState } from 'react';
import { sfx, haptic } from '@/lib/sound';

const KINDS = [
  { key: 'fehler', icon: '🐞', label: 'Fehler', hint: 'Was ist passiert? In welchem Spiel? Was hast du davor gemacht?' },
  { key: 'wunsch', icon: '✨', label: 'Wunsch', hint: 'Was soll besser oder anders werden?' },
  { key: 'idee', icon: '💡', label: 'Idee', hint: 'Neues Spiel oder neue Funktion – erzähl!' },
];

// Bottom-Sheet: Fehler, Wünsche, Ideen melden → landet als Auftrag in der Dev-Inbox
export default function SupportSheet({ me, game, onClose }) {
  const [kind, setKind] = useState('fehler');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const k = KINDS.find((x) => x.key === kind);

  const send = async () => {
    if (text.trim().length < 5) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, text, name: me?.name, profileId: me?.id, game, device: navigator.userAgent }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) throw new Error(d.error || 'Senden hat nicht geklappt');
      sfx.correct();
      haptic('success');
      onClose(true);
    } catch (e) {
      setErr(String(e.message || e));
      sfx.wrong();
      haptic('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay sheet-overlay" onClick={() => onClose(false)}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="row between">
          <h2 style={{ fontSize: 26 }}>Fehler melden & Wünsche</h2>
          <button className="icon-btn" onClick={() => onClose(false)} aria-label="Schließen">✕</button>
        </div>
        <div className="seg">
          {KINDS.map((x) => (
            <button key={x.key} className={'seg-btn' + (kind === x.key ? ' on' : '')} onClick={() => { sfx.click(); haptic('tap'); setKind(x.key); }}>{x.icon} {x.label}</button>
          ))}
        </div>
        <textarea className="input" rows={5} maxLength={2000} placeholder={k.hint} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        {err && <div className="err-box">{err}</div>}
        <button className="btn big full" disabled={busy || text.trim().length < 5} onClick={send}>{busy ? 'Sende …' : 'Abschicken 📬'}</button>
        <div className="muted center" style={{ fontSize: 12, fontWeight: 700 }}>Geht direkt an die Entwicklung. Dein Name wird mitgeschickt.</div>
      </div>
    </div>
  );
}
