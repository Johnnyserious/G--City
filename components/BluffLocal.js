'use client';
import { useEffect, useState } from 'react';
import { ask } from '@/lib/dialog';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { ScoreList } from './ImposterParts';
import { BluffSettings, BluffRules, QuestionBox, OptionPicker, RevealList } from './BluffParts';
import { sfx, isMuted, setMuted } from '@/lib/sound';
import { randomAvatar } from '@/lib/avatar';
import { ALL } from '@/lib/bluffQuestions';
import { MIN_PLAYERS, isTruth, buildOptions, scoreRound, winners } from '@/lib/bluff';

// Lügen-Quiz auf EINEM Handy: Das Handy wird zum Lügen-Schreiben und zum Wählen reihum weitergegeben.
const KEY = 'bluff_local';
const uid = () => Math.random().toString(36).slice(2, 10);

function load(me) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d?.players?.length) return { players: d.players.map((p) => ({ ...p, score: 0 })), settings: d.settings, used: d.used || [] };
    const imp = JSON.parse(localStorage.getItem('imp_local') || 'null'); // Spielerliste aus Imposter übernehmen
    if (imp?.players?.length) return { players: imp.players.map((p) => ({ ...p, score: 0 })), settings: null, used: [] };
  } catch {}
  return { players: [{ id: uid(), name: me.name, avatar: me.avatar, score: 0 }], settings: null, used: [] };
}

export default function BluffLocal({ me, onLeave }) {
  const [init] = useState(() => load(me));
  const [players, setPlayers] = useState(init.players);
  const [settings, setSettings] = useState(init.settings || { count: 8, seconds: 60, topics: [ALL] });
  const [used, setUsed] = useState(init.used);
  const [g, setG] = useState({ phase: 'setup' });
  const [muted, setM] = useState(isMuted());
  const up = (x) => setG((o) => ({ ...o, ...x }));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ players: players.map(({ id, name, avatar }) => ({ id, name, avatar })), settings, used: used.slice(-200) })); } catch {}
  }, [players, settings, used]);

  const start = async () => {
    up({ phase: 'loading', error: '' });
    try {
      const r = await fetch('/api/bluff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topics: settings.topics, count: settings.count, exclude: used }) });
      const d = await r.json();
      if (!d.questions?.length) throw new Error(d.error || 'Keine Fragen bekommen');
      setUsed((u) => [...u, ...d.questions.map((q) => q.question)].slice(-200));
      setPlayers((ps) => ps.map((p) => ({ ...p, score: 0 })));
      sfx.fanfare();
      setG({ phase: 'write', qs: d.questions, qIdx: 0, turn: 0, open: false, lies: {}, picks: {}, likes: {} });
    } catch (e) {
      setG({ phase: 'setup', error: String(e.message || e) });
    }
  };

  const leave = async () => (g.phase === 'setup' || (await ask({ title: 'Spiel verlassen?', ok: 'Verlassen', cancel: 'Weiterspielen' }))) && onLeave();
  const q = g.qs?.[g.qIdx];
  const cur = players[g.turn];
  const next = players[g.turn + 1];

  const afterWrite = (lies) => {
    if (g.turn + 1 < players.length) return up({ lies, turn: g.turn + 1, open: false });
    up({ lies, options: buildOptions(q, lies), phase: 'choose', turn: 0, open: false });
  };
  const afterPick = (picks) => {
    if (g.turn + 1 < players.length) return up({ picks, turn: g.turn + 1, open: false });
    const pts = scoreRound(g.options, picks, g.likes);
    setPlayers((ps) => ps.map((p) => ({ ...p, score: p.score + (pts[p.id] || 0) })));
    up({ picks, phase: 'reveal', roundPoints: pts });
  };
  const nextQuestion = () => {
    if (g.qIdx + 1 >= g.qs.length) return up({ phase: 'final' });
    sfx.pick();
    up({ phase: 'write', qIdx: g.qIdx + 1, turn: 0, open: false, lies: {}, picks: {}, likes: {}, options: [], roundPoints: {} });
  };
  // Likes während der Auflösung zählen sofort
  const likeInReveal = (pid, oid) => {
    const list = g.likes[pid] || [];
    const likes = { ...g.likes, [pid]: list.includes(oid) ? list.filter((x) => x !== oid) : [...list, oid] };
    const after = scoreRound(g.options, g.picks, likes);
    setPlayers((ps) => ps.map((p) => ({ ...p, score: p.score - (g.roundPoints[p.id] || 0) + (after[p.id] || 0) })));
    up({ likes, roundPoints: after });
  };

  let body;
  if (g.phase === 'setup') body = <Setup players={players} setPlayers={setPlayers} settings={settings} setSettings={setSettings} onStart={start} error={g.error} />;
  else if (g.phase === 'loading') body = <div className="thinking"><div className="dice">🤥</div><h2>Fragen werden gemischt …</h2></div>;
  else if (g.phase === 'final') body = <Final players={players} onAgain={start} onSetup={() => setG({ phase: 'setup' })} />;
  else if ((g.phase === 'write' || g.phase === 'choose') && !g.open) {
    body = (
      <div className="stack center">
        <div className="muted" style={{ fontWeight: 800 }}>Frage {g.qIdx + 1}/{g.qs.length} · {g.phase === 'write' ? 'Lügen schreiben' : 'Wahrheit finden'} · {g.turn + 1}/{players.length}</div>
        <div className="card stack" style={{ padding: 30 }}>
          <Avatar avatar={cur.avatar} size={110} style={{ margin: '0 auto' }} />
          <h2 style={{ fontSize: 32 }}>📱 Handy an <span style={{ color: 'var(--yellow)' }}>{cur.name}</span></h2>
          <p className="muted" style={{ margin: 0, fontWeight: 700 }}>{g.phase === 'write' ? 'Niemand sonst schaut hin!' : 'Geheim wählen – die anderen gucken weg.'}</p>
        </div>
        <button className="btn big full green" onClick={() => { sfx.pop(); up({ open: true }); }}>Ich bin {cur.name} ➜</button>
      </div>
    );
  } else if (g.phase === 'write') {
    body = (
      <div className="stack">
        <QuestionBox q={q} idx={g.qIdx} total={g.qs.length} />
        <LieInput key={g.qIdx + '-' + g.turn} q={q} name={cur.name} nextName={next?.name} onDone={(text) => { sfx.correct(); afterWrite({ ...g.lies, [cur.id]: text }); }} />
      </div>
    );
  } else if (g.phase === 'choose') {
    const liked = g.likes[cur.id] || [];
    body = (
      <div className="stack">
        <QuestionBox q={q} idx={g.qIdx} total={g.qs.length} />
        <b className="center" style={{ display: 'block' }}>{cur.name}: Welche Antwort ist echt? 🕵️</b>
        <div className="muted center" style={{ fontWeight: 700, fontSize: 13 }}>Antippen = wählen und weitergeben. 👍 erst vorher vergeben.</div>
        <OptionPicker
          options={g.options}
          myId={cur.id}
          picked={g.picks[cur.id]}
          liked={liked}
          onPick={(oid) => afterPick({ ...g.picks, [cur.id]: oid })}
          onLike={(oid) => up({ likes: { ...g.likes, [cur.id]: liked.includes(oid) ? liked.filter((x) => x !== oid) : [...liked, oid] } })}
        />
      </div>
    );
  } else if (g.phase === 'reveal') {
    body = <LocalReveal g={g} q={q} players={players} onNext={nextQuestion} onLike={likeInReveal} />;
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Verlassen">←</button>
        <div className="row" style={{ gap: 8 }}>
          <div className="code-pill" style={{ letterSpacing: 1 }}>🤥 Ein Handy</div>
          {g.phase !== 'setup' && <button className="icon-btn" title="Spiel abbrechen" onClick={() => ask({ title: 'Spiel abbrechen?', text: 'Zurück zur Spielerliste.', ok: 'Abbrechen', cancel: 'Weiterspielen' }).then((ok) => ok && setG({ phase: 'setup' }))}>🏁</button>}
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>
      {body}
    </div>
  );
}

function LieInput({ q, name, nextName, onDone }) {
  const [text, setText] = useState('');
  const [warn, setWarn] = useState('');
  const submit = () => {
    const t = text.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!t) return;
    if (isTruth(t, q)) {
      sfx.wrong();
      setWarn('Psst – das ist (fast) die richtige Antwort! 😏 Denk dir was anderes aus.');
      return;
    }
    onDone(t);
  };
  return (
    <div className="card stack">
      <b>{name}, erfinde eine Antwort, die echt klingt:</b>
      <div className="row">
        <input className="input" autoFocus maxLength={60} placeholder="Deine Lüge …" value={text} onChange={(e) => { setText(e.target.value); setWarn(''); }} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="off" />
        <button className="btn teal" disabled={!text.trim()} onClick={submit}>➜</button>
      </div>
      {warn && <div className="hint-box" style={{ margin: 0 }}>{warn}</div>}
      <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{nextName ? `Danach geht das Handy an ${nextName}.` : 'Du bist der Letzte – danach wird gewählt.'}</div>
    </div>
  );
}

function LocalReveal({ g, q, players, onNext, onLike }) {
  const [liker, setLiker] = useState('');
  useEffect(() => { sfx.fanfare(); }, []);
  const truth = g.options.find((o) => o.truth);
  const found = players.filter((p) => g.picks[p.id] === truth.id);
  return (
    <div className="stack">
      <QuestionBox q={q} idx={g.qIdx} total={g.qs.length} />
      <div className="card center stack">
        <div className="muted" style={{ fontWeight: 800 }}>Die Wahrheit</div>
        <div className="display" style={{ fontSize: 30, color: 'var(--green)' }}>{q.answer}</div>
        {q.explanation && <div className="answer-box" style={{ fontWeight: 700, margin: 0 }}>💡 {q.explanation}</div>}
        <div className="muted" style={{ fontWeight: 800 }}>{found.length ? 'Gefunden von ' + found.map((p) => p.name).join(', ') : 'Keiner hat’s gefunden 😬'}</div>
      </div>
      <RevealList options={g.options} picks={g.picks} likes={g.likes} players={players} myId={liker} onLike={liker ? (oid) => onLike(liker, oid) : null} />
      <div className="card stack">
        <div className="muted" style={{ fontWeight: 800 }}>Noch 👍 verteilen? Erst Namen wählen:</div>
        <div className="seg seg-wrap">
          {players.map((p) => (
            <button key={p.id} className={'seg-btn' + (liker === p.id ? ' on' : '')} onClick={() => setLiker(liker === p.id ? '' : p.id)}>{p.name}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3>
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
          Diese Runde: {players.filter((p) => g.roundPoints[p.id]).map((p) => `${p.name} +${g.roundPoints[p.id]}`).join(' · ') || 'keine Punkte'}
        </div>
        <ScoreList players={players} />
      </div>
      <button className="btn big full pink" onClick={onNext}>{g.qIdx + 1 >= g.qs.length ? 'Zum Endstand 🏆' : 'Nächste Frage ➜'}</button>
    </div>
  );
}

function Setup({ players, setPlayers, settings, setSettings, onStart, error }) {
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
      <div className="card"><BluffSettings settings={settings} showTime={false} onChange={(x) => setSettings((s) => ({ ...s, ...x }))} /></div>
      <BluffRules />
      {error && <div className="idea-error">Fragen konnten nicht geladen werden: {error}</div>}
      <button className="btn big full pink" disabled={!ok} onClick={onStart}>{ok ? 'Spiel starten 🤥' : `Mindestens ${MIN_PLAYERS} Spieler`}</button>
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
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Bester Lügner 🤥👑'}</h1>
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
      <button className="btn big full pink" onClick={onAgain}>Nochmal 🤥</button>
      <div className="center"><button className="btn small ghost" onClick={onSetup}>Spieler / Einstellungen ändern</button></div>
    </div>
  );
}
