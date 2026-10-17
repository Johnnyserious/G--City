'use client';
import { useCallback, useEffect, useState } from 'react';
import Avatar from './Avatar';
import { useAccount } from '@/lib/account';
import { isDevEmail, REQUEST_TYPES } from '@/lib/dev';
import { MOCK } from '@/lib/supabase';
import { sfx, haptic } from '@/lib/sound';

// Dev-Mode: entweder per PIN freigeschaltet (Schlüssel im Handy gemerkt) oder per Shop-Login mit Jonas' Mail
const KEY = 'gcity_dev_key';
export const getDevKey = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
export const setDevKey = (k) => { try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY); } catch {} window.dispatchEvent(new Event('gcity-dev')); };
export const useIsDev = () => {
  const acc = useAccount();
  const [key, setKey] = useState('');
  useEffect(() => {
    const read = () => setKey(getDevKey());
    read();
    window.addEventListener('gcity-dev', read);
    return () => window.removeEventListener('gcity-dev', read);
  }, []);
  return !!key || (!!acc.user && (isDevEmail(acc.user.email) || (MOCK && /jonas/i.test(acc.user.email))));
};

// PIN prüfen → Schlüssel merken
export async function unlockWithPin(pin) {
  const r = await fetch('/api/dev', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'unlock', pin }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.key) throw new Error(d.error || 'Falsche PIN');
  setDevKey(d.key);
  return true;
}

async function devApi(token, method, body) {
  const key = getDevKey();
  const r = await fetch('/api/dev', {
    method,
    headers: { ...(key ? { 'x-dev-key': key } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error || 'Fehler');
  return d;
}

const STATUS = {
  wartet: { t: '⏳ Wartet auf Claude', c: 'var(--card2)' },
  'rückfrage': { t: '💬 Claude hat eine Rückfrage', c: '#6b4a00' },
  vorschau: { t: '👀 Vorschau bereit', c: '#1d3a6e' },
  live: { t: '✅ Live', c: '#1f4a33' },
  geschlossen: { t: '🗑️ Verworfen', c: '#3a1f2a' },
};

const GAMES = [
  ['quiz', '🧠', 'Quiz'], ['imposter', '🕵️', 'Imposter'], ['meme', '😂', 'Meme'], ['draw', '🎨', 'Zeichnen'],
  ['bluff', '🤥', 'Lügen-Quiz'], ['emoji', '🦁', 'Emoji'], ['estimate', '📏', 'Schätzen'],
];

// Bots in der Lobby – für jeden Host. Kostet nichts: Bots spielen nach festen Regeln, ohne KI.
export function DevBots({ room, me }) {
  const s = room.state;
  if (s.hostId !== me.id || s.phase !== 'lobby') return null;
  const botsList = s.order.map((id) => s.players[id]).filter((p) => p?.bot);
  const full = s.order.length >= 16;
  return (
    <div className="card dev-bots">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <b style={{ fontSize: 18 }}>🤖 Gegen Bots spielen</b>
          <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Zu wenige Leute? Bots füllen auf.</div>
        </div>
        <button className="btn small teal" disabled={full} onClick={() => { sfx.join(); haptic('tap'); room.send('addBot'); }}>＋ Bot</button>
      </div>
      {botsList.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {botsList.map((b) => (
            <span key={b.id} className="bot-chip"><Avatar avatar={b.avatar} size={26} /> {b.name.replace('🤖 ', '')} <button className="bot-x" onClick={() => room.send('removeBot', { id: b.id })} aria-label={'Bot ' + b.name + ' entfernen'}>✕</button></span>
          ))}
        </div>
      )}
      {s.game === 'draw' && botsList.length > 0 && <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Bots raten mit, malen aber nicht – wenn ein Bot dran ist, geht’s direkt weiter.</div>}
    </div>
  );
}

export default function DevPanel({ onClose, onCreate }) {
  const acc = useAccount();
  const isDev = useIsDev();
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState('idee');
  const [busy, setBusy] = useState('');
  const [answer, setAnswer] = useState({});
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!acc.token && !getDevKey()) return;
    try {
      const d = await devApi(acc.token, 'GET');
      setItems(d.requests);
      setErr('');
    } catch (e) { setErr(String(e.message || e)); }
  }, [acc.token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);

  const run = async (key, body, msg) => {
    setBusy(key); setErr('');
    try {
      const d = await devApi(acc.token, 'POST', body);
      setItems(d.requests);
      if (msg) { setToast(msg); sfx.correct(); }
      return true;
    } catch (e) { setErr(String(e.message || e)); sfx.wrong(); return false; } finally { setBusy(''); }
  };

  const submit = async () => {
    if (title.trim().length < 3) return;
    if (await run('create', { action: 'create', title, text, type }, 'Auftrag ist in der Inbox 📬')) { setTitle(''); setText(''); }
  };

  if (!isDev) {
    return (
      <div className="wrap"><div className="card center stack" style={{ marginTop: 40 }}><h2>Kein Zugriff</h2><p className="muted">Der Dev-Mode ist nur für Jonas.</p><button className="btn" onClick={onClose}>Zurück</button></div></div>
    );
  }

  return (
    <div className="wrap">
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <button className="icon-btn" onClick={onClose} aria-label="Zurück">←</button>
        <div className="logo">G <span>Dev</span></div>
        <div className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={load} aria-label="Neu laden">🔄</button>
          {getDevKey() && <button className="icon-btn" title="Dev-Mode auf diesem Handy sperren" onClick={() => { if (confirm('Dev-Mode auf diesem Handy wieder sperren?')) { setDevKey(''); onClose(); } }}>🔒</button>}
        </div>
      </div>

      <div className="stack">
        <div className="card stack">
          <h3 style={{ fontSize: 24 }}>🤖 Spiele allein testen</h3>
          <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Raum öffnen, in der Lobby auf <b>„＋ Bot“</b> tippen – die Bots spielen automatisch mit.</p>
          <div className="seg seg-wrap">
            {GAMES.map(([g, icon, name]) => (
              <button key={g} className="seg-btn" onClick={() => { sfx.pick(); onCreate(g); }}>{icon} {name}</button>
            ))}
          </div>
        </div>

        <div className="card stack">
          <h3 style={{ fontSize: 24 }}>📬 Auftrag an Claude</h3>
          <div className="seg">
            {REQUEST_TYPES.map((t) => (
              <button key={t.key} className={'seg-btn' + (type === t.key ? ' on' : '')} onClick={() => setType(t.key)}>{t.icon} {t.label}</button>
            ))}
          </div>
          <input className="input" maxLength={120} placeholder="Kurzer Titel, z. B. „Timer im Quiz auf 60 s“" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" rows={5} maxLength={4000} placeholder="Was genau soll passieren? Je genauer, desto besser. Bei Fehlern: Was hast du gemacht, was kam raus?" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn full pink" disabled={title.trim().length < 3 || busy === 'create'} onClick={submit}>{busy === 'create' ? '…' : 'In die Inbox 📬'}</button>
          <div className="hint-box" style={{ margin: 0, fontSize: 14 }}>
            Danach im Chat mit Claude einfach <b>„Inbox“</b> schreiben. Claude baut es als <b>Vorschau</b>; hier kannst du sie ansehen und dann <b>live schalten</b>.
          </div>
        </div>

        {err && <div className="idea-error">{err}</div>}

        <h3 style={{ fontSize: 22 }}>Aufträge</h3>
        {!items && !err && <div className="muted center" style={{ fontWeight: 700 }}>Lade …</div>}
        {items && items.length === 0 && <div className="muted center" style={{ fontWeight: 700 }}>Noch keine Aufträge.</div>}
        {items?.map((it) => {
          const st = STATUS[it.status] || STATUS.wartet;
          const ty = REQUEST_TYPES.find((t) => t.key === it.type);
          return (
            <div key={it.number} className="card dev-item stack">
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <b style={{ fontSize: 17 }}>{ty?.icon || '📌'} {it.title}</b>
                <span className="chip" style={{ background: st.c, flexShrink: 0 }}>{st.t}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>#{it.number} · {new Date(it.created).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</div>
              {it.comment && <div className="answer-box dev-comment">{it.comment.body}</div>}
              {it.status === 'vorschau' && (
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {it.preview && it.preview !== 'building' ? (
                    <a className="btn small teal" href={it.preview} target="_blank" rel="noreferrer">👀 Vorschau ansehen</a>
                  ) : (
                    <span className="muted" style={{ fontWeight: 800 }}>⏳ Vorschau wird gebaut …</span>
                  )}
                  <button className="btn small green" disabled={busy === 'live' + it.number} onClick={() => confirm('Diese Änderung für alle live schalten?') && run('live' + it.number, { action: 'live', number: it.number }, 'Wird veröffentlicht – in ca. 1 Minute live 🚀')}>🚀 Live schalten</button>
                </div>
              )}
              {['wartet', 'rückfrage', 'vorschau'].includes(it.status) && (
                <div className="stack">
                  <div className="row">
                    <input className="input" style={{ fontSize: 15, padding: '10px 12px' }} placeholder={it.status === 'rückfrage' ? 'Antwort an Claude …' : 'Nachtrag / Änderungswunsch …'} value={answer[it.number] || ''} onChange={(e) => setAnswer({ ...answer, [it.number]: e.target.value })} />
                    <button className="btn small" disabled={!answer[it.number]?.trim()} onClick={async () => { if (await run('r' + it.number, { action: 'reply', number: it.number, text: answer[it.number] }, 'Gesendet')) setAnswer({ ...answer, [it.number]: '' }); }}>➜</button>
                  </div>
                  <div><button className="btn small ghost" onClick={() => confirm('Auftrag verwerfen?') && run('d' + it.number, { action: 'discard', number: it.number }, 'Verworfen')}>Verwerfen</button></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
