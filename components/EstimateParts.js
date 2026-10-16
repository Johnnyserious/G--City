'use client';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { sfx } from '@/lib/sound';
import { EST_TOPICS, ALL } from '@/lib/estimateQuestions';
import { COUNT_OPTIONS, SECOND_OPTIONS, PLACE_POINTS, EXACT_BONUS, DUEL, parseNum, fmt, withUnit } from '@/lib/estimate';

export const topicOf = (key) => EST_TOPICS.find((t) => t.key === key) || { name: '', icon: '🎲' };

export function EstSettings({ settings, onChange, disabled, showTime = true }) {
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
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Modus</div>
        <div className="mode-grid">
          {[
            { v: 'all', t: '👥 Alle gegen alle', d: 'Alle schätzen jede Frage. Rangliste nach Abstand.' },
            { v: 'duel', t: '⚔️ Duelle 1 gegen 1', d: 'Zwei schätzen, die anderen wetten, wer näher dran ist.' },
          ].map((m) => (
            <button key={m.v} className={'mode-card' + (settings.mode === m.v ? ' on' : '')} disabled={disabled} onClick={() => { sfx.vote(); onChange({ mode: m.v }); }}>
              <div style={{ fontWeight: 900, fontSize: 17 }}>{m.t}</div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{m.d}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Fragen</div>
        <div className="seg">
          {COUNT_OPTIONS.map((n) => (
            <button key={n} className={'seg-btn' + (settings.count === n ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ count: n }); }}>{n}</button>
          ))}
        </div>
      </div>
      {showTime && (
        <div>
          <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Zeit pro Frage</div>
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
          {EST_TOPICS.map((t) => (
            <button key={t.key} className={'seg-btn' + (!all && settings.topics.includes(t.key) ? ' on' : '')} disabled={disabled} onClick={() => toggle(t.key)}>{t.icon} {t.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EstRules() {
  return (
    <details className="card rules">
      <summary className="display" style={{ fontSize: 20 }}>So geht’s 📖</summary>
      <ol>
        <li><b>Alle gegen alle:</b> Jeder schätzt eine Zahl. Am nächsten dran: +{PLACE_POINTS[0]}, Zweiter +{PLACE_POINTS[1]}, Dritter +{PLACE_POINTS[2]}. Gleich weit weg = gleicher Platz.</li>
        <li><b>Duell:</b> Zwei schätzen gegeneinander. Wer näher dran ist: +{DUEL.win} (Gleichstand je +{DUEL.tie}). Alle anderen wetten vorher, wer gewinnt: richtig getippt +{DUEL.bet}.</li>
        <li>Exakt getroffen: +{EXACT_BONUS} Bonus.</li>
        <li>🃏 <b>Doppelt-Joker:</b> Einmal pro Spiel kannst du deine Punkte bei einer Frage verdoppeln – entscheide dich vor dem Abschicken.</li>
      </ol>
    </details>
  );
}

export function EstQuestion({ q, idx, total }) {
  const t = topicOf(q.topic);
  return (
    <div className="card bluff-q">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="chip" style={{ background: 'var(--card2)' }}>{t.icon} {t.name}</span>
        <span className="muted" style={{ fontWeight: 800 }}>Frage {idx + 1}/{total}</span>
      </div>
      <div className="qtext" style={{ margin: 0 }}>{q.q}</div>
    </div>
  );
}

export function JokerToggle({ on, available, onChange }) {
  if (!available && !on) return <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>🃏 Joker schon benutzt</div>;
  return (
    <button className={'joker-toggle' + (on ? ' on' : '')} onClick={() => { sfx.joker(); onChange(!on); }}>
      🃏 {on ? 'Doppelt-Joker an – Punkte ×2' : 'Doppelt-Joker einsetzen?'}
    </button>
  );
}

// Zahl eingeben (mit Vorschau, damit man sich bei großen Zahlen nicht vertippt)
export function NumberEntry({ unit, jokerAvailable, onSubmit, submitted, onEdit, placeholder = 'Deine Schätzung …' }) {
  const [text, setText] = useState('');
  const [joker, setJoker] = useState(false);
  const v = parseNum(text);
  useEffect(() => { if (!submitted) setJoker(false); }, [submitted]);
  if (submitted) {
    return (
      <div className="card center stack">
        <div className="muted" style={{ fontWeight: 800 }}>Deine Schätzung</div>
        <div className="display" style={{ fontSize: 34 }}>{withUnit(submitted.v, unit)}{submitted.joker ? ' 🃏' : ''}</div>
        {onEdit && <div><button className="btn small ghost" onClick={() => { setText(String(submitted.v).replace('.', ',')); setJoker(!!submitted.joker); onEdit(); }}>✏️ Ändern</button></div>}
      </div>
    );
  }
  const send = () => {
    if (v == null) return;
    sfx.correct();
    onSubmit(v, joker);
  };
  return (
    <div className="card stack">
      <div className="row">
        <input className="input est-input" autoFocus inputMode="decimal" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} autoComplete="off" />
        <span className="est-unit">{unit === 'Jahr' ? '' : unit}</span>
      </div>
      <div className="muted" style={{ fontWeight: 800, minHeight: 22 }}>{text ? (v == null ? 'Bitte nur eine Zahl eingeben' : `= ${withUnit(v, unit)}`) : 'Komma für Dezimalzahlen, z. B. 5,5'}</div>
      <JokerToggle on={joker} available={jokerAvailable} onChange={setJoker} />
      <button className="btn green big full" disabled={v == null} onClick={send}>Schätzung abgeben ✓</button>
    </div>
  );
}

// Wette im Duell
export function BetPicker({ a, b, current, jokerAvailable, onBet }) {
  const [joker, setJoker] = useState(false);
  return (
    <div className="card stack">
      <b className="center" style={{ display: 'block' }}>Wer ist näher dran? Wette!</b>
      <div className="duel-bets">
        {[['A', a], ['B', b]].map(([side, p]) => (
          <button key={side} className={'vote-card' + (current === side ? ' on' : '')} onClick={() => { sfx.vote(); onBet(side, joker); }}>
            <Avatar avatar={p?.avatar} size={64} />
            <b>{p?.name}</b>
          </button>
        ))}
      </div>
      {!current && <JokerToggle on={joker} available={jokerAvailable} onChange={setJoker} />}
    </div>
  );
}

// Auflösung
export function EstReveal({ q, mode, duel, entries, bets, result, players }) {
  const P = (id) => players.find((p) => p.id === id);
  const pts = result?.points || {};
  const rows = Object.entries(entries)
    .filter(([, e]) => Number.isFinite(e?.v))
    .map(([pid, e]) => ({ pid, v: e.v, joker: e.joker, diff: Math.abs(e.v - q.a), pts: pts[pid]?.pts || 0, exact: pts[pid]?.exact }))
    .sort((x, y) => x.diff - y.diff);
  const pct = (d) => (q.a ? Math.round((d / Math.abs(q.a)) * 100) : null);
  return (
    <div className="stack">
      <div className="card center stack">
        <div className="muted" style={{ fontWeight: 800 }}>Richtige Antwort</div>
        <div className="display est-answer">{withUnit(q.a, q.unit)}</div>
        {q.info && <div className="answer-box" style={{ fontWeight: 700, margin: 0 }}>💡 {q.info}</div>}
      </div>
      {mode === 'duel' && result && (
        <div className="card center" style={{ fontWeight: 900, fontSize: 18 }}>
          {result.winner === 'tie' ? '🤝 Unentschieden!' : result.winner ? `⚔️ ${P(duel[result.winner === 'A' ? 0 : 1])?.name} gewinnt das Duell!` : 'Keiner hat geschätzt'}
        </div>
      )}
      <div className="card">
        {rows.length === 0 && <div className="muted center" style={{ fontWeight: 700 }}>Keine Schätzungen abgegeben.</div>}
        <div className="rank-list">
          {rows.map((r, i) => (
            <div key={r.pid}>
              <b style={{ width: 24 }}>{i + 1}.</b>
              <Avatar avatar={P(r.pid)?.avatar} size={32} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block' }}>{P(r.pid)?.name}{r.joker ? ' 🃏' : ''}{r.exact ? ' 🎯' : ''}</b>
                <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{withUnit(r.v, q.unit)} · {r.exact ? 'exakt!' : `${fmt(r.diff, q.unit === 'Jahr' ? '' : q.unit)} daneben${pct(r.diff) != null && q.unit !== 'Jahr' ? ` (${pct(r.diff)} %)` : ''}`}</span>
              </span>
              <span className="display" style={{ color: r.pts ? 'var(--green)' : 'var(--muted)' }}>+{r.pts}</span>
            </div>
          ))}
        </div>
      </div>
      {mode === 'duel' && Object.keys(bets || {}).length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>Wetten</h3>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(bets).map(([pid, side]) => (
              <span key={pid} className="bluff-picker" style={{ background: pts[pid]?.pts ? '#1f4a33' : '#120b30' }}>
                <Avatar avatar={P(pid)?.avatar} size={24} /> {P(pid)?.name} → {P(duel[side === 'A' ? 0 : 1])?.name}{entries[pid]?.joker ? ' 🃏' : ''} · +{pts[pid]?.pts || 0}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
