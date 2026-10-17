'use client';
import { useEffect, useState } from 'react';
import { ask } from '@/lib/dialog';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import RevealCard, { SecretWord } from './RevealCard';
import { useCountdown, TimerBar, WordTable, ScoreList, ImposterSettings, RulesBox } from './ImposterParts';
import { sfx, isMuted, setMuted } from '@/lib/sound';
import { randomAvatar } from '@/lib/avatar';
import { pickWord, ALL_KEY } from '@/lib/imposterWords';
import { chooseImposters, speakingOrder, voteOutcome, guessCorrect, awardPoints, TURN_SECONDS, DISCUSS_SECONDS, WORD_ROUNDS, MIN_PLAYERS, POINTS } from '@/lib/imposter';

// Imposter auf EINEM Handy: Das Handy wird reihum weitergegeben. Alles läuft nur in diesem Browser.
const KEY = 'imp_local';
const uid = () => Math.random().toString(36).slice(2, 10);

function load(me) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && Array.isArray(d.players) && d.players.length) return { players: d.players.map((p) => ({ ...p, score: 0 })), settings: d.settings || { imposters: 1, category: ALL_KEY } };
  } catch {}
  return { players: [{ id: uid(), name: me.name, avatar: me.avatar, score: 0 }], settings: { imposters: 1, category: ALL_KEY } };
}

export default function ImposterLocal({ me, onLeave }) {
  const [init] = useState(() => load(me));
  const [players, setPlayers] = useState(init.players);
  const [settings, setSettings] = useState(init.settings);
  const [g, setG] = useState({ phase: 'setup' });
  const [muted, setM] = useState(isMuted());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ players: players.map(({ id, name, avatar }) => ({ id, name, avatar })), settings })); } catch {}
  }, [players, settings]);

  const P = (id) => players.find((p) => p.id === id);
  const up = (x) => setG((o) => ({ ...o, ...x }));

  const startRound = () => {
    const ids = players.map((p) => p.id);
    const secret = pickWord(settings.category, g.used || []);
    const imposters = chooseImposters(ids, settings.imposters);
    sfx.fanfare();
    setG({
      phase: 'reveal', idx: 0, seen: false, secret, imposters,
      order: speakingOrder(ids, imposters), turn: 0, wordRound: 1, words: [], deadline: Date.now() + TURN_SECONDS * 1000,
      used: [...(g.used || []), secret.word].slice(-150), roundNo: (g.roundNo || 0) + 1,
    });
  };

  const leave = () => {
    if (g.phase === 'setup') { onLeave(); return; }
    ask({ title: 'Spiel verlassen?', ok: 'Verlassen', cancel: 'Weiterspielen' }).then((ok) => ok && onLeave());
  };

  let body = null;
  if (g.phase === 'setup') body = <Setup me={me} players={players} setPlayers={setPlayers} settings={settings} setSettings={setSettings} onStart={startRound} />;
  if (g.phase === 'reveal') {
    const p = players[g.idx];
    const last = g.idx === players.length - 1;
    const next = players[g.idx + 1];
    body = (
      <div className="stack">
        <div className="center">
          <div className="muted" style={{ fontWeight: 800 }}>Spieler {g.idx + 1} von {players.length}</div>
          <h2 style={{ fontSize: 32 }}>📱 Handy an <span style={{ color: 'var(--yellow)' }}>{p.name}</span></h2>
          <p className="muted" style={{ margin: '4px 0 0', fontWeight: 700 }}>Nur {p.name} schaut hin. Karte antippen, Wort merken, wieder zudecken.</p>
        </div>
        <RevealCard
          key={g.idx}
          maxOpens={2}
          onRevealed={() => up({ seen: true })}
          secret={<SecretWord imposter={g.imposters.includes(p.id)} word={g.secret.word} tip={g.secret.tip} category={g.secret.icon + ' ' + g.secret.category} />}
          cover={<div className="cover-face"><Avatar avatar={p.avatar} size={110} /><div className="display" style={{ fontSize: 30 }}>{p.name}</div></div>}
        />
        <button
          className="btn big full green"
          disabled={!g.seen}
          onClick={() => {
            sfx.pop();
            if (last) up({ phase: 'words', turn: 0, wordRound: 1, deadline: Date.now() + TURN_SECONDS * 1000 });
            else up({ idx: g.idx + 1, seen: false });
          }}
        >
          {!g.seen ? 'Erst Karte aufdecken 👆' : last ? 'Alle haben gesehen – los geht’s ➜' : `Gemerkt ✓ – weiter an ${next.name}`}
        </button>
      </div>
    );
  }
  if (g.phase === 'words') body = <LocalWords g={g} up={up} P={P} />;
  if (g.phase === 'discuss') body = <LocalDiscuss g={g} up={up} P={P} />;
  if (g.phase === 'vote') body = <LocalVote g={g} up={up} players={players} settings={settings} />;
  if (g.phase === 'guess') body = <LocalGuess g={g} up={up} P={P} />;
  if (g.phase === 'result') {
    body = (
      <LocalResult
        g={g} players={players} P={P}
        onNext={startRound}
        onSetup={() => setG({ phase: 'setup', used: g.used, roundNo: g.roundNo })}
        onAcceptGuess={() => {
          setPlayers((ps) => {
            const c = ps.map((p) => ({ ...p }));
            const m = Object.fromEntries(c.map((p) => [p.id, p]));
            for (const p of c) if (!g.imposters.includes(p.id)) p.score -= POINTS.crew;
            awardPoints(m, c.map((p) => p.id), g.imposters, 'imposter');
            return c;
          });
          up({ outcome: 'imposter', guessAccepted: true });
        }}
      />
    );
  }

  // Punkte vergeben, sobald ein Ergebnis feststeht
  useEffect(() => {
    if (g.phase !== 'result' || g.scored) return;
    setPlayers((ps) => {
      const c = ps.map((p) => ({ ...p }));
      awardPoints(Object.fromEntries(c.map((p) => [p.id, p])), c.map((p) => p.id), g.imposters, g.outcome);
      return c;
    });
    up({ scored: true });
  }, [g.phase, g.scored]); // eslint-disable-line

  return (
    <div className="wrap">
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Verlassen">←</button>
        <div className="row" style={{ gap: 8 }}>
          <div className="code-pill" style={{ letterSpacing: 1 }}>🕵️ Ein Handy</div>
          {g.phase !== 'setup' && <button className="icon-btn" title="Runde abbrechen" onClick={() => ask({ title: 'Runde abbrechen?', text: 'Zurück zur Spielerliste.', ok: 'Abbrechen', cancel: 'Weiterspielen' }).then((ok) => ok && setG({ phase: 'setup', used: g.used, roundNo: g.roundNo }))}>🏁</button>}
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>
      {body}
    </div>
  );
}

// ---------------- Spieler eintragen ----------------
function Setup({ players, setPlayers, settings, setSettings, onStart }) {
  const [name, setName] = useState('');
  const add = () => {
    const n = name.trim().slice(0, 16);
    if (!n) return;
    sfx.join();
    setPlayers((ps) => [...ps, { id: uid(), name: n, avatar: randomAvatar(), score: 0 }]);
    setName('');
  };
  const move = (i, d) => setPlayers((ps) => {
    const c = [...ps];
    const j = i + d;
    if (j < 0 || j >= c.length) return ps;
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const ok = players.length >= MIN_PLAYERS;
  return (
    <div className="stack">
      <h1 style={{ fontSize: 38 }}>Wer spielt mit?</h1>
      <p className="muted" style={{ margin: 0, fontWeight: 700 }}>In der Reihenfolge, in der ihr sitzt – so wird das Handy weitergegeben.</p>
      <div className="card stack">
        {players.map((p, i) => (
          <div key={p.id} className="row local-player">
            <Avatar avatar={p.avatar} size={40} />
            <b style={{ flex: 1 }}>{p.name}</b>
            <button className="icon-btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Hoch">▲</button>
            <button className="icon-btn small" onClick={() => move(i, 1)} disabled={i === players.length - 1} aria-label="Runter">▼</button>
            <button className="icon-btn small" onClick={() => setPlayers((ps) => ps.filter((x) => x.id !== p.id))} aria-label="Entfernen">✕</button>
          </div>
        ))}
        <div className="row">
          <input className="input" maxLength={16} placeholder="Name hinzufügen …" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn teal" disabled={!name.trim()} onClick={add}>+</button>
        </div>
      </div>
      <div className="card">
        <ImposterSettings settings={settings} playerCount={players.length} onChange={(x) => setSettings((s) => ({ ...s, ...x }))} />
      </div>
      <RulesBox />
      <button className="btn big full pink" disabled={!ok} onClick={onStart}>{ok ? 'Los jeht\'s 🕵️' : `Mindestens ${MIN_PLAYERS} Spieler`}</button>
    </div>
  );
}

// ---------------- Wörter sagen ----------------
function LocalWords({ g, up, P }) {
  const speaker = g.order[g.turn];
  const sp = P(speaker);
  const left = useCountdown(g.deadline, true);
  const [text, setText] = useState('');
  useEffect(() => setText(''), [g.turn, g.wordRound]);

  const next = () => {
    sfx.pop();
    const words = [...g.words, { pid: speaker, round: g.wordRound, text: text.trim().slice(0, 30), skipped: !text.trim() }];
    let turn = g.turn + 1;
    let wordRound = g.wordRound;
    if (turn >= g.order.length) {
      if (wordRound < WORD_ROUNDS) { wordRound += 1; turn = 0; } else return up({ words, phase: 'discuss', deadline: Date.now() + DISCUSS_SECONDS * 1000 });
    }
    up({ words, turn, wordRound, deadline: Date.now() + TURN_SECONDS * 1000 });
  };

  return (
    <div className="stack">
      <div className="row between">
        <h2 style={{ fontSize: 26 }}>Runde {g.wordRound}/{WORD_ROUNDS}</h2>
        <span className="chip" style={{ background: 'var(--card2)' }}>{g.secret.icon} {g.secret.category}</span>
      </div>
      <p className="muted center" style={{ margin: 0, fontWeight: 700 }}>Handy in die Mitte legen. Jeder sagt laut EIN Wort.</p>
      <div className="card center my-turn">
        <div className="row" style={{ justifyContent: 'center' }}>
          <Avatar avatar={sp?.avatar} size={52} />
          <div className="display" style={{ fontSize: 28 }}>{sp?.name} ist dran</div>
        </div>
        <div style={{ marginTop: 10 }}><TimerBar left={left} total={TURN_SECONDS} /></div>
        <div className={'display' + (left <= 0 ? ' shake' : '')} style={{ fontSize: 20, color: left <= 0 ? 'var(--red)' : 'var(--muted)', marginBottom: 10 }}>{left > 0 ? `${Math.ceil(left)} s` : 'Zeit um!'}</div>
        <div className="row">
          <input className="input" maxLength={30} placeholder="Gesagtes Wort notieren (optional)" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} autoComplete="off" />
          <button className="btn teal" onClick={next}>➜</button>
        </div>
      </div>
      <WordTable players={g.order.map(P).filter(Boolean)} words={g.words} currentId={speaker} currentRound={g.wordRound} />
    </div>
  );
}

function LocalDiscuss({ g, up, P }) {
  const left = useCountdown(g.deadline, true);
  return (
    <div className="stack">
      <h2 className="center" style={{ fontSize: 30 }}>Wer ist der Imposter? 🤔</h2>
      <TimerBar left={left} total={DISCUSS_SECONDS} />
      <p className="center muted" style={{ margin: 0, fontWeight: 800 }}>{left > 0 ? `${Math.ceil(left)} s – erklärt euch, verteidigt euch!` : 'Zeit um – abstimmen!'}</p>
      <WordTable players={g.order.map(P).filter(Boolean)} words={g.words} />
      <button className="btn big full pink" onClick={() => { sfx.joker(); up({ phase: 'vote' }); }}>Zur Abstimmung 🗳️</button>
    </div>
  );
}

function LocalVote({ g, up, players, settings }) {
  const decide = (target) => {
    sfx.vote();
    const o = voteOutcome(target, g.imposters);
    if (o === 'guess') up({ phase: 'guess', accused: target });
    else up({ phase: 'result', accused: target, outcome: o, scored: false });
  };
  return (
    <div className="stack">
      <h2 className="center" style={{ fontSize: 30 }}>Abstimmung 🗳️</h2>
      <div className="card center" style={{ fontWeight: 800 }}>Zählt laut <span className="display" style={{ color: 'var(--yellow)' }}>3 – 2 – 1</span> und zeigt gleichzeitig auf euren Verdächtigen. Wer hat die meisten Finger abbekommen?</div>
      <div className="vote-grid">
        {players.map((p) => (
          <button key={p.id} className="vote-card" onClick={() => decide(p.id)}>
            <Avatar avatar={p.avatar} size={64} />
            <b>{p.name}</b>
          </button>
        ))}
        {settings.imposters === 'random' && (
          <button className="vote-card" onClick={() => decide('none')}>
            <div style={{ fontSize: 54, lineHeight: '64px' }}>🤷</div>
            <b>Keiner</b>
          </button>
        )}
        <button className="vote-card" onClick={() => decide(null)}>
          <div style={{ fontSize: 54, lineHeight: '64px' }}>⚖️</div>
          <b>Gleichstand</b>
        </button>
      </div>
    </div>
  );
}

function LocalGuess({ g, up, P }) {
  const acc = P(g.accused);
  const [text, setText] = useState('');
  useEffect(() => { sfx.correct(); }, []);
  const submit = () => {
    const guess = text.trim();
    up({ phase: 'result', guess, outcome: guessCorrect(guess, g.secret.word) ? 'imposter' : 'crew', scored: false });
  };
  return (
    <div className="stack center">
      <div style={{ fontSize: 64 }}>🚨</div>
      <h2 style={{ fontSize: 30 }}>{acc?.name} ist Imposter!</h2>
      <Avatar avatar={acc?.avatar} size={90} style={{ margin: '0 auto' }} />
      <div className="card stack">
        <b>Handy an {acc?.name}: Rate das geheime Wort. Triffst du, gewinnst du trotzdem.</b>
        <div className="row">
          <input className="input" autoFocus maxLength={40} placeholder="Das Wort war …" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && submit()} />
          <button className="btn teal" disabled={!text.trim()} onClick={submit}>➜</button>
        </div>
        <button className="btn small ghost" onClick={() => up({ phase: 'result', guess: '', outcome: 'crew', scored: false })}>Keine Ahnung 🤷</button>
      </div>
    </div>
  );
}

function LocalResult({ g, players, P, onNext, onSetup, onAcceptGuess }) {
  const imps = g.imposters.map(P).filter(Boolean);
  const acc = g.accused && g.accused !== 'none' ? P(g.accused) : null;
  useEffect(() => {
    sfx.fanfare();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, zIndex: 100 });
  }, []);

  let headline;
  if (g.outcome === 'crew') headline = imps.length ? 'Crew gewinnt! 🎉' : 'Richtig – es gab keinen Imposter! 🎉';
  else if (g.outcome === 'imposter') headline = imps.length > 1 ? 'Die Imposter gewinnen! 😈' : 'Der Imposter gewinnt! 😈';
  else headline = 'Ups – es gab gar keinen Imposter 🙈';

  let why = '';
  if (g.guess != null && acc && g.imposters.includes(g.accused)) why = g.outcome === 'imposter' ? `${acc.name} wurde erwischt, hat aber das Wort erraten („${g.guess}“).` : `${acc.name} wurde erwischt und hat ${g.guess ? `„${g.guess}“` : 'nichts'} geraten – falsch!`;
  else if (g.accused === 'none') why = 'Ihr habt auf „Keiner“ getippt.';
  else if (!g.accused) why = 'Gleichstand – keiner flog raus.';
  else if (acc) why = `Ihr habt ${acc.name} rausgeworfen – ${g.imposters.includes(g.accused) ? 'Treffer.' : 'der war unschuldig.'}`;

  return (
    <div className="stack">
      <div className="card center stack">
        <h1 style={{ fontSize: 38 }}>{headline}</h1>
        <p className="muted" style={{ margin: 0, fontWeight: 800 }}>{why}</p>
        <div className="answer-box">
          <div>Das Wort war <b className="secret-word blue" style={{ fontSize: 26 }}>{g.secret.word}</b></div>
          <div className="muted" style={{ fontWeight: 700 }}>Tipp für den Imposter: <span style={{ color: '#ff7a86', fontWeight: 900 }}>{g.secret.tip}</span></div>
        </div>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {imps.length ? imps.map((p) => (
            <div key={p.id} className="player-chip"><Avatar avatar={p.avatar} size={64} /><div className="name">{p.name}</div><span className="host-badge" style={{ background: 'var(--red)', color: '#fff' }}>IMPOSTER</span></div>
          )) : <b>Kein Imposter in dieser Runde</b>}
        </div>
        {g.outcome === 'crew' && g.guess && !g.guessAccepted && (
          <button className="btn small ghost" onClick={() => ask({ title: 'Doch richtig?', text: 'Das geratene Wort als richtig zählen?', ok: 'Ja, zählt', cancel: 'Nein' }).then((ok) => ok && onAcceptGuess())}>Geraten zählt doch ✓</button>
        )}
      </div>
      <WordTable players={g.order.map(P).filter(Boolean)} words={g.words} />
      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 4 }}>Punktestand</h3>
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Crew-Sieg +{POINTS.crew} pro Person · Imposter-Sieg +{POINTS.imposter}</div>
        <ScoreList players={players} />
      </div>
      <button className="btn big full pink" onClick={onNext}>Nächste Runde 🕵️</button>
      <div className="center"><button className="btn small ghost" onClick={onSetup}>Spieler / Einstellungen ändern</button></div>
    </div>
  );
}
