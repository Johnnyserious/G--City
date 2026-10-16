'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { sfx } from '@/lib/sound';
import { LIMITS } from '@/lib/gameIdeas';

// Abstimmung über neue Spiele in der Spielezentrale. Jeder kann beliebig viele Ideen antippen und eigene schreiben.
export default function IdeaBoard({ me }) {
  const [ideas, setIdeas] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // null = noch nicht entschieden
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const order = useRef(null); // Reihenfolge einfrieren, damit nichts beim Antippen herumspringt
  const pending = useRef(0);

  const apply = useCallback((list) => {
    if (!order.current) {
      order.current = [...list].sort((a, b) => b.voters.length - a.voters.length).map((i) => i.key);
    } else {
      for (const i of list) if (!order.current.includes(i.key)) order.current.push(i.key);
    }
    setIdeas(list);
  }, []);

  const load = useCallback(async () => {
    if (pending.current) return;
    try {
      const r = await fetch('/api/ideas', { cache: 'no-store' });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setError('');
      apply(d.ideas);
    } catch (e) {
      setError(String(e.message || e));
    }
  }, [apply]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const myVotes = ideas ? ideas.filter((i) => i.voters.some((v) => v.id === me.id)).length : 0;
  useEffect(() => {
    if (ideas && open === null) setOpen(myVotes === 0);
  }, [ideas, open, myVotes]);

  const post = async (body) => {
    pending.current++;
    try {
      const r = await fetch('/api/ideas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setError('');
      apply(d.ideas);
      return true;
    } catch (e) {
      setError(String(e.message || e));
      return false;
    } finally {
      pending.current--;
    }
  };

  const voter = { id: me.id, name: me.name, avatar: me.avatar };
  const toggle = (idea) => {
    const on = !idea.voters.some((v) => v.id === me.id);
    on ? sfx.vote() : sfx.click();
    // sofort anzeigen, Server bestätigt danach
    setIdeas((list) => list.map((i) => (i.key === idea.key ? { ...i, voters: on ? [...i.voters, voter] : i.voters.filter((v) => v.id !== me.id) } : i)));
    post({ action: 'vote', key: idea.key, on, voter });
  };

  const submit = async () => {
    if (title.trim().length < 2 || busy) return;
    setBusy(true);
    const ok = await post({ action: 'add', title, text, author: voter });
    setBusy(false);
    if (ok) {
      sfx.fanfare();
      setTitle('');
      setText('');
      setAdding(false);
    }
  };

  const remove = (idea) => {
    if (!confirm(`Deine Idee „${idea.title}“ löschen?`)) return;
    post({ action: 'delete', key: idea.key, author: voter });
  };

  const sorted = ideas && order.current ? [...ideas].sort((a, b) => order.current.indexOf(a.key) - order.current.indexOf(b.key)) : [];
  const maxVotes = ideas ? Math.max(0, ...ideas.map((i) => i.voters.length)) : 0;

  return (
    <div className="card idea-board">
      <button className="idea-head" onClick={() => { sfx.click(); setOpen(!open); }} aria-expanded={!!open}>
        <div>
          <h3 style={{ fontSize: 24 }}>💡 Was bauen wir als Nächstes?</h3>
          <div className="muted" style={{ fontWeight: 700, fontSize: 14 }}>
            {myVotes ? `Du hast ${myVotes} ${myVotes === 1 ? 'Idee' : 'Ideen'} gewählt` : 'Tipp alle Spiele an, die du feiern würdest – so viele du willst.'}
          </div>
        </div>
        <span className="idea-toggle">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="stack" style={{ marginTop: 12 }}>
          {error && <div className="idea-error">{error}</div>}
          {!ideas && !error && <div className="muted center" style={{ fontWeight: 700 }}>Lade Ideen …</div>}
          <div className="idea-grid">
            {sorted.map((idea) => {
              const mine = idea.voters.some((v) => v.id === me.id);
              const top = maxVotes > 0 && idea.voters.length === maxVotes;
              return (
                <div key={idea.key} className={'idea' + (mine ? ' on' : '')}>
                  <button className="idea-main" onClick={() => toggle(idea)} aria-pressed={mine}>
                    <div className="idea-top">
                      <span className="idea-emoji">{idea.emoji}</span>
                      <span className={'idea-check' + (mine ? ' on' : '')}>{mine ? '✓' : '+'}</span>
                    </div>
                    <b className="idea-title">{idea.title}</b>
                    <div className="idea-tags">
                      {top && <span className="idea-tag gold">🏆 vorne</span>}
                      {idea.done && <span className="idea-tag done">✅ jetzt spielbar</span>}
                      {idea.planned && <span className="idea-tag">📌 geplant</span>}
                      {idea.custom && <span className="idea-tag">von {idea.author}</span>}
                    </div>
                    {idea.text && <p className="idea-text">{idea.text}</p>}
                    <div className="idea-voters">
                      {idea.voters.slice(0, 6).map((v) => <Avatar key={v.id} avatar={v.avatar} size={24} />)}
                      <span className="idea-count">{idea.voters.length} {idea.voters.length === 1 ? 'Stimme' : 'Stimmen'}</span>
                    </div>
                  </button>
                  {idea.custom && idea.authorId === me.id && (
                    <button className="idea-del" onClick={() => remove(idea)} aria-label="Idee löschen" title="Idee löschen">✕</button>
                  )}
                </div>
              );
            })}
          </div>

          {adding ? (
            <div className="idea-form stack">
              <input className="input" maxLength={LIMITS.title} placeholder="Name des Spiels" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              <textarea className="input" rows={3} maxLength={LIMITS.text} placeholder="Wie geht’s? Kurz erklärt …" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="row">
                <button className="btn teal" disabled={title.trim().length < 2 || busy} onClick={submit}>{busy ? 'Speichere …' : 'Idee abschicken 🚀'}</button>
                <button className="btn ghost small" onClick={() => setAdding(false)}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <button className="btn full ghost" onClick={() => { sfx.pop(); setAdding(true); }}>✍️ Eigene Idee schreiben</button>
          )}
        </div>
      )}
    </div>
  );
}
