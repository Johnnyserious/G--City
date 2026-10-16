'use client';
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { sfx } from '@/lib/sound';
import { WORD_ROUNDS } from '@/lib/imposter';
import { WORD_CATEGORIES, ALL_KEY } from '@/lib/imposterWords';

// Restzeit in Sekunden (now = Funktion, die die aktuelle Zeit liefert)
export function useCountdown(deadline, active, now = Date.now) {
  const [left, setLeft] = useState(0);
  const lastTick = useRef(null);
  useEffect(() => {
    if (!active || !deadline) return;
    const upd = () => {
      const l = Math.max(0, (deadline - now()) / 1000);
      setLeft(l);
      const s = Math.ceil(l);
      if (s <= 5 && s > 0 && lastTick.current !== s) { lastTick.current = s; sfx.tick(); }
    };
    upd();
    const t = setInterval(upd, 200);
    return () => clearInterval(t);
  }, [deadline, active, now]);
  return left;
}

export function TimerBar({ left, total }) {
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const color = pct > 50 ? 'var(--teal)' : pct > 25 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className="timer" style={{ marginBottom: 10 }}>
      <div style={{ width: pct + '%', background: color }} />
    </div>
  );
}

// Alle gesagten Wörter: eine Zeile pro Spieler, eine Spalte pro Runde
export function WordTable({ players, words, currentId, currentRound }) {
  return (
    <div className="word-table">
      <div className="wt-row wt-head">
        <span />
        {Array.from({ length: WORD_ROUNDS }, (_, i) => <span key={i}>Runde {i + 1}</span>)}
      </div>
      {players.map((p) => (
        <div key={p.id} className={'wt-row' + (p.id === currentId ? ' now' : '')}>
          <span className="wt-name"><Avatar avatar={p.avatar} size={30} /> <b>{p.name}</b></span>
          {Array.from({ length: WORD_ROUNDS }, (_, i) => {
            const w = words.find((x) => x.pid === p.id && x.round === i + 1);
            const isNow = p.id === currentId && currentRound === i + 1;
            return (
              <span key={i} className={'wt-word' + (w?.skipped ? ' skip' : '')}>
                {w ? (w.skipped ? '⏱️ –' : w.text) : isNow ? <i className="dots">…</i> : ''}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ScoreList({ players, highlight = [] }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="rank-list">
      {ranked.map((p, i) => (
        <div key={p.id} style={highlight.includes(p.id) ? { outline: '3px solid var(--red)' } : null}>
          <b style={{ width: 24 }}>{i + 1}.</b>
          <Avatar avatar={p.avatar} size={32} />
          <span style={{ flex: 1, fontWeight: 800 }}>{p.name}</span>
          <span className="display">{p.score}</span>
        </div>
      ))}
    </div>
  );
}

// Einstellungen: Anzahl Imposter + Wort-Thema
export function ImposterSettings({ settings, onChange, disabled, playerCount }) {
  const opts = [
    { v: 1, label: '1 Imposter' },
    { v: 2, label: '2 Imposter', need: 5 },
    { v: 'random', label: '🎲 Überraschung', sub: '0, 1 oder 2 – keiner weiß es' },
  ];
  return (
    <div className="stack">
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Wie viele Imposter?</div>
        <div className="seg">
          {opts.map((o) => (
            <button
              key={o.v}
              className={'seg-btn' + (settings.imposters === o.v ? ' on' : '')}
              disabled={disabled || (o.need && playerCount < o.need)}
              onClick={() => { sfx.click(); onChange({ imposters: o.v }); }}
              title={o.need && playerCount < o.need ? `Ab ${o.need} Spielern` : o.sub}
            >
              {o.label}
            </button>
          ))}
        </div>
        {settings.imposters === 'random' && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Bei der Abstimmung gibt es dann auch „Keiner ist Imposter“.</div>}
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Wörter aus</div>
        <div className="seg seg-wrap">
          {[{ key: ALL_KEY, name: 'Alles gemischt', icon: '🎲' }, ...WORD_CATEGORIES].map((c) => (
            <button key={c.key} className={'seg-btn' + (settings.category === c.key ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); onChange({ category: c.key }); }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const RULES_TEXT = [
  'Alle bekommen dasselbe geheime Wort – nur der Imposter nicht. Er bekommt bloß einen Tipp.',
  `Reihum sagt jeder ein Wort, das zum Geheimwort passt. Insgesamt ${WORD_ROUNDS} Runden.`,
  'Nicht zu offensichtlich (sonst weiß der Imposter Bescheid), nicht zu schwammig (sonst wirkst du verdächtig).',
  'Danach kurz diskutieren und abstimmen. Wird der Imposter erwischt, darf er noch das Wort raten – trifft er, gewinnt er trotzdem.',
];

export function RulesBox() {
  return (
    <details className="card rules">
      <summary className="display" style={{ fontSize: 20 }}>So geht’s 📖</summary>
      <ol>
        {RULES_TEXT.map((t) => <li key={t}>{t}</li>)}
      </ol>
    </details>
  );
}
