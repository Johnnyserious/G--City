'use client';
import Avatar from './Avatar';
import { sfx } from '@/lib/sound';
import { BLUFF_TOPICS, ALL } from '@/lib/bluffQuestions';
import { COUNT_OPTIONS, SECOND_OPTIONS, POINTS, pickersOf, likesOf } from '@/lib/bluff';

export const topicOf = (key) => BLUFF_TOPICS.find((t) => t.key === key) || { name: 'Gemischt', icon: '🎲' };

export function BluffSettings({ settings, onChange, disabled, showTime = true }) {
  const all = !settings.topics?.length || settings.topics.includes(ALL);
  const toggle = (key) => {
    sfx.click();
    if (key === ALL) return onChange({ topics: [ALL] });
    const cur = all ? [] : settings.topics;
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    onChange({ topics: next.length ? next : [ALL] });
  };
  return (
    <div className="stack">
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Fragen</div>
        <div className="seg">
          {COUNT_OPTIONS.map((n) => (
            <button key={n} className={'seg-btn' + (settings.count === n ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ count: n }); }}>{n} Fragen</button>
          ))}
        </div>
      </div>
      {showTime && (
        <div>
          <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Zeit zum Lügen</div>
          <div className="seg">
            {SECOND_OPTIONS.map((t) => (
              <button key={t} className={'seg-btn' + (settings.seconds === t ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ seconds: t }); }}>{t} s</button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Themen (mehrere möglich)</div>
        <div className="seg seg-wrap">
          <button className={'seg-btn' + (all ? ' on' : '')} disabled={disabled} onClick={() => toggle(ALL)}>🎲 Alles gemischt</button>
          {BLUFF_TOPICS.map((t) => (
            <button key={t.key} className={'seg-btn' + (!all && settings.topics.includes(t.key) ? ' on' : '')} disabled={disabled} onClick={() => toggle(t.key)}>{t.icon} {t.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BluffRules() {
  return (
    <details className="card rules">
      <summary className="display" style={{ fontSize: 20 }}>So geht’s 📖</summary>
      <ol>
        <li>Eine echte, aber kaum bekannte Frage erscheint.</li>
        <li>Jeder erfindet eine falsche Antwort, die möglichst echt klingt.</li>
        <li>Dann stehen alle Lügen und die Wahrheit gemischt da. Jeder tippt auf die Antwort, die er für echt hält – die eigene Lüge geht nicht.</li>
        <li>Wahrheit gefunden: +{POINTS.truth}. Jeder, der auf deine Lüge reinfällt: +{POINTS.fooled} für dich. Jedes 👍 für deine Lüge: +{POINTS.like}.</li>
      </ol>
    </details>
  );
}

export function QuestionBox({ q, idx, total }) {
  const t = topicOf(q.topic);
  return (
    <div className="card bluff-q">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="chip" style={{ background: 'var(--card2)' }}>{t.icon} {t.name}</span>
        <span className="muted" style={{ fontWeight: 800 }}>Frage {idx + 1}/{total}</span>
      </div>
      <div className="qtext" style={{ margin: 0 }}>{q.question}</div>
    </div>
  );
}

// Auswahl: Antworten antippen, Lügen anderer liken
export function OptionPicker({ options, myId, picked, liked = [], onPick, onLike }) {
  return (
    <div className="bluff-options">
      {options.map((o) => {
        const mine = o.authors.includes(myId);
        return (
          <div key={o.id} className={'bluff-opt' + (picked === o.id ? ' on' : '') + (mine ? ' mine' : '')}>
            <button className="bluff-opt-main" disabled={mine} onClick={() => { sfx.vote(); onPick(o.id); }}>
              <span>{o.text}</span>
              {mine && <small className="muted">deine Lüge</small>}
            </button>
            {!o.truth && !mine && onLike && (
              <button className={'bluff-like' + (liked.includes(o.id) ? ' on' : '')} onClick={() => { sfx.pop(); onLike(o.id); }} aria-label="Lustig">👍</button>
            )}
            {o.truth && !mine && onLike && <span className="bluff-like ghost" />}
          </div>
        );
      })}
    </div>
  );
}

// Auflösung: wer hat was geschrieben, wer ist reingefallen
export function RevealList({ options, picks, likes, players, myId, onLike }) {
  const P = (id) => players.find((p) => p.id === id);
  const sorted = [...options].sort((a, b) => (b.truth ? 1 : 0) - (a.truth ? 1 : 0) || pickersOf(b.id, picks).length - pickersOf(a.id, picks).length);
  return (
    <div className="stack">
      {sorted.map((o) => {
        const fell = pickersOf(o.id, picks);
        const lk = likesOf(o.id, likes);
        const mine = o.authors.includes(myId);
        return (
          <div key={o.id} className={'card bluff-reveal' + (o.truth ? ' truth' : '')}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{o.truth ? '✅ ' : '🤥 '}{o.text}</div>
              {!o.truth && (
                onLike && !mine ? (
                  <button className={'bluff-like' + ((likes[myId] || []).includes(o.id) ? ' on' : '')} onClick={() => { sfx.pop(); onLike(o.id); }}>👍 {lk.length || ''}</button>
                ) : lk.length ? <span className="chip" style={{ background: 'var(--card2)' }}>👍 {lk.length}</span> : null
              )}
            </div>
            <div className="muted" style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>
              {o.truth ? 'Die Wahrheit' : 'Gelogen von ' + o.authors.map((a) => P(a)?.name || '?').join(' & ')}
              {!o.truth && fell.length > 0 && ` · +${fell.length * POINTS.fooled}`}
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {fell.length ? fell.map((id) => (
                <span key={id} className="bluff-picker"><Avatar avatar={P(id)?.avatar} size={24} /> {P(id)?.name}</span>
              )) : <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{o.truth ? 'Keiner hat’s gefunden 😬' : 'Keiner ist drauf reingefallen'}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
