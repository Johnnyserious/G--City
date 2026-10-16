'use client';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { ScoreList } from './ImposterParts';
import { EstSettings, EstRules, EstQuestion, NumberEntry, BetPicker, EstReveal } from './EstimateParts';
import { sfx, isMuted, setMuted } from '@/lib/sound';
import { randomAvatar } from '@/lib/avatar';
import { ALL } from '@/lib/estimateQuestions';
import { MIN_PLAYERS, pickQuestions, pickDuel, scoreAll, scoreDuel, winners } from '@/lib/estimate';

// Schätz-Duell auf EINEM Handy: Jeder tippt seine Schätzung (oder Wette) geheim, dann wird das Handy weitergegeben.
const KEY = 'est_local';
const uid = () => Math.random().toString(36).slice(2, 10);

function load(me) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d?.players?.length) return { players: d.players.map((p) => ({ ...p, score: 0 })), settings: d.settings, used: d.used || [] };
    for (const k of ['bluff_local', 'imp_local']) {
      const o = JSON.parse(localStorage.getItem(k) || 'null');
      if (o?.players?.length) return { players: o.players.map((p) => ({ ...p, score: 0 })), settings: null, used: [] };
    }
  } catch {}
  return { players: [{ id: uid(), name: me.name, avatar: me.avatar, score: 0 }], settings: null, used: [] };
}

export default function EstimateLocal({ me, onLeave }) {
  const [init] = useState(() => load(me));
  const [players, setPlayers] = useState(init.players);
  const [settings, setSettings] = useState(init.settings || { count: 8, seconds: 30, topics: [ALL], mode: 'all' });
  const [used, setUsed] = useState(init.used);
  const [g, setG] = useState({ phase: 'setup' });
  const [muted, setM] = useState(isMuted());
  const up = (x) => setG((o) => ({ ...o, ...x }));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ players: players.map(({ id, name, avatar }) => ({ id, name, avatar })), settings, used: used.slice(-200) })); } catch {}
  }, [players, settings, used]);

  // Reihenfolge für eine Frage: Duellanten zuerst, dann die Wettenden
  const setupQuestion = (base, idx) => {
    const ids = players.map((p) => p.id);
    let duel = [];
    let duelCounts = base.duelCounts || {};
    if (settings.mode === 'duel') {
      duel = pickDuel(ids, duelCounts, base.duel || []);
      duelCounts = { ...duelCounts };
      for (const id of duel) duelCounts[id] = (duelCounts[id] || 0) + 1;
    }
    const turnOrder = settings.mode === 'duel' ? [...duel, ...ids.filter((id) => !duel.includes(id))] : ids;
    return { ...base, phase: 'answer', idx, duel, duelCounts, turnOrder, turn: 0, open: false, entries: {}, bets: {}, result: null };
  };

  const start = () => {
    const qs = pickQuestions(settings.topics, settings.count, used);
    setUsed((u) => [...u, ...qs.map((q) => q.id)].slice(-200));
    setPlayers((ps) => ps.map((p) => ({ ...p, score: 0 })));
    sfx.fanfare();
    setG(setupQuestion({ qs, jokerUsed: {}, duelCounts: {}, duel: [] }, 0));
  };

  const finishTurn = (patch) => {
    const n = { ...g, ...patch };
    if (n.turn + 1 < n.turnOrder.length) return setG({ ...n, turn: n.turn + 1, open: false });
    const q = n.qs[n.idx];
    const result = settings.mode === 'duel' ? scoreDuel(q.a, n.duel, n.entries, n.bets) : { points: scoreAll(q.a, n.entries) };
    setPlayers((ps) => ps.map((p) => ({ ...p, score: p.score + (result.points[p.id]?.pts || 0) })));
    sfx.fanfare();
    setG({ ...n, phase: 'reveal', result });
  };

  const nextQuestion = () => {
    if (g.idx + 1 >= g.qs.length) return up({ phase: 'final' });
    sfx.pick();
    setG(setupQuestion(g, g.idx + 1));
  };

  const leave = () => (g.phase === 'setup' || confirm('Spiel wirklich verlassen?')) && onLeave();
  const q = g.qs?.[g.idx];
  const curId = g.turnOrder?.[g.turn];
  const cur = players.find((p) => p.id === curId);
  const isDuelist = settings.mode !== 'duel' || g.duel?.includes(curId);
  const [A, B] = (g.duel || []).map((id) => players.find((p) => p.id === id));

  let body;
  if (g.phase === 'setup') body = <Setup players={players} setPlayers={setPlayers} settings={settings} setSettings={setSettings} onStart={start} />;
  else if (g.phase === 'final') body = <Final players={players} onAgain={start} onSetup={() => setG({ phase: 'setup' })} />;
  else if (g.phase === 'answer' && !g.open) {
    body = (
      <div className="stack center">
        <div className="muted" style={{ fontWeight: 800 }}>Frage {g.idx + 1}/{g.qs.length} · {g.turn + 1}/{g.turnOrder.length}</div>
        {settings.mode === 'duel' && <div className="card center duel-head"><span><Avatar avatar={A?.avatar} size={40} /><b>{A?.name}</b></span><span className="display" style={{ fontSize: 22, color: 'var(--yellow)' }}>VS</span><span><Avatar avatar={B?.avatar} size={40} /><b>{B?.name}</b></span></div>}
        <div className="card stack" style={{ padding: 30 }}>
          <Avatar avatar={cur?.avatar} size={110} style={{ margin: '0 auto' }} />
          <h2 style={{ fontSize: 32 }}>📱 Handy an <span style={{ color: 'var(--yellow)' }}>{cur?.name}</span></h2>
          <p className="muted" style={{ margin: 0, fontWeight: 700 }}>{isDuelist ? 'Geheim schätzen – die anderen gucken weg.' : 'Geheim wetten, wer das Duell gewinnt.'}</p>
        </div>
        <button className="btn big full green" onClick={() => { sfx.pop(); up({ open: true }); }}>Ich bin {cur?.name} ➜</button>
      </div>
    );
  } else if (g.phase === 'answer') {
    const jokerAvailable = !g.jokerUsed[curId];
    body = (
      <div className="stack">
        <EstQuestion q={q} idx={g.idx} total={g.qs.length} />
        <b className="center" style={{ display: 'block' }}>{cur?.name}{isDuelist ? ', deine Schätzung:' : ''}</b>
        {isDuelist ? (
          <NumberEntry
            key={g.idx + '-' + curId}
            unit={q.unit}
            jokerAvailable={jokerAvailable}
            onSubmit={(v, joker) => finishTurn({ entries: { ...g.entries, [curId]: { v, joker } }, jokerUsed: joker ? { ...g.jokerUsed, [curId]: true } : g.jokerUsed })}
          />
        ) : (
          <BetPicker
            key={g.idx + '-' + curId}
            a={A} b={B}
            jokerAvailable={jokerAvailable}
            onBet={(side, joker) => finishTurn({
              bets: { ...g.bets, [curId]: side },
              entries: joker ? { ...g.entries, [curId]: { joker: true } } : g.entries,
              jokerUsed: joker ? { ...g.jokerUsed, [curId]: true } : g.jokerUsed,
            })}
          />
        )}
      </div>
    );
  } else if (g.phase === 'reveal') {
    body = (
      <div className="stack">
        <EstQuestion q={q} idx={g.idx} total={g.qs.length} />
        <EstReveal q={q} mode={settings.mode} duel={g.duel} entries={g.entries} bets={g.bets} result={g.result} players={players} />
        <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3><ScoreList players={players} /></div>
        <button className="btn big full pink" onClick={nextQuestion}>{g.idx + 1 >= g.qs.length ? 'Zum Endstand 🏆' : 'Nächste Frage ➜'}</button>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Verlassen">←</button>
        <div className="row" style={{ gap: 8 }}>
          <div className="code-pill" style={{ letterSpacing: 1 }}>📏 Ein Handy</div>
          {g.phase !== 'setup' && <button className="icon-btn" title="Spiel abbrechen" onClick={() => confirm('Spiel abbrechen und zurück zur Spielerliste?') && setG({ phase: 'setup' })}>🏁</button>}
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>
      {body}
    </div>
  );
}

function Setup({ players, setPlayers, settings, setSettings, onStart }) {
  const [name, setName] = useState('');
  const add = () => {
    const n = name.trim().slice(0, 16);
    if (!n) return;
    sfx.join();
    setPlayers((ps) => [...ps, { id: uid(), name: n, avatar: randomAvatar(), score: 0 }]);
    setName('');
  };
  const ok = players.length >= MIN_PLAYERS;
  return (
    <div className="stack">
      <h1 style={{ fontSize: 38 }}>Wer spielt mit?</h1>
      <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Das Handy geht in dieser Reihenfolge herum.</p>
      <div className="card stack">
        {players.map((p) => (
          <div key={p.id} className="row local-player">
            <Avatar avatar={p.avatar} size={40} />
            <b style={{ flex: 1 }}>{p.name}</b>
            <button className="icon-btn small" onClick={() => setPlayers((ps) => ps.filter((x) => x.id !== p.id))} aria-label="Entfernen">✕</button>
          </div>
        ))}
        <div className="row">
          <input className="input" maxLength={16} placeholder="Name hinzufügen …" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn teal" disabled={!name.trim()} onClick={add}>+</button>
        </div>
      </div>
      <div className="card"><EstSettings settings={settings} showTime={false} onChange={(x) => setSettings((s) => ({ ...s, ...x }))} /></div>
      <EstRules />
      <button className="btn big full pink" disabled={!ok} onClick={onStart}>{ok ? 'Spiel starten 📏' : `Mindestens ${MIN_PLAYERS} Spieler`}</button>
    </div>
  );
}

function Final({ players, onAgain, onSetup }) {
  const wins = winners(players);
  useEffect(() => {
    sfx.fanfare();
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 }, zIndex: 100 });
  }, []);
  return (
    <div className="stack">
      <div className="card center stack">
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Schätz-König 📏👑'}</h1>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
          {wins.map((p) => (
            <div key={p.id} className="player-chip" style={{ width: 96 }}>
              <Avatar avatar={p.avatar} size={84} />
              <div className="name" style={{ maxWidth: 96 }}>{p.name}</div>
              <span className="host-badge">{p.score} Punkte</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Endstand</h3><ScoreList players={players} /></div>
      <button className="btn big full pink" onClick={onAgain}>Nochmal 📏</button>
      <div className="center"><button className="btn small ghost" onClick={onSetup}>Spieler / Einstellungen ändern</button></div>
    </div>
  );
}
