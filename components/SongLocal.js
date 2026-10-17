'use client';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ask } from '@/lib/dialog';
import Avatar from './Avatar';
import { ScoreList } from './ImposterParts';
import { SongSettings, SongRules, SongCover, catName } from './SongParts';
import { sfx, haptic, isMuted, setMuted } from '@/lib/sound';
import { randomAvatar } from '@/lib/avatar';
import { ALL, LOCAL_POINTS, winners } from '@/lib/songs';
import { playSong, stopSong, loadSong, audioCtx } from '@/lib/songAudio';

// Songs erraten auf EINEM Handy: Der Song läuft für alle, wer ihn zuerst erkennt, wird angetippt.
const KEY = 'songs_local';
const uid = () => Math.random().toString(36).slice(2, 10);

function load(me) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d?.players?.length) return { players: d.players.map((p) => ({ ...p, score: 0 })), settings: d.settings, used: d.used || [] };
    for (const k of ['est_local', 'bluff_local', 'imp_local']) {
      const o = JSON.parse(localStorage.getItem(k) || 'null');
      if (o?.players?.length) return { players: o.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: 0 })), settings: null, used: [] };
    }
  } catch {}
  return { players: [{ id: uid(), name: me.name, avatar: me.avatar, score: 0 }], settings: null, used: [] };
}

export default function SongLocal({ me, onLeave }) {
  const [init] = useState(() => load(me));
  const [players, setPlayers] = useState(init.players);
  const [settings, setSettings] = useState(init.settings || { count: 15, cats: [ALL] });
  const [used, setUsed] = useState(init.used);
  const [g, setG] = useState({ phase: 'setup' });
  const [muted, setM] = useState(isMuted());
  const [err, setErr] = useState('');

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ players: players.map(({ id, name, avatar }) => ({ id, name, avatar })), settings, used: used.slice(-300) })); } catch {}
  }, [players, settings, used]);
  useEffect(() => () => stopSong(), []);

  const start = async () => {
    audioCtx(); // im Tipp anlegen (iPhone)
    setErr('');
    setG({ phase: 'loading' });
    try {
      const r = await fetch('/api/songs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cats: settings.cats, count: settings.count, exclude: used }) });
      const d = await r.json();
      if (!d.songs?.length) throw new Error(d.error || 'Keine Songs bekommen');
      setUsed((u) => [...u, ...d.songs.map((x) => x.id)].slice(-300));
      setPlayers((ps) => ps.map((p) => ({ ...p, score: 0 })));
      sfx.fanfare();
      setG({ phase: 'play', songs: d.songs, idx: 0, history: [] });
    } catch (e) {
      setErr(String(e.message || e));
      setG({ phase: 'setup' });
    }
  };

  const leave = async () => (g.phase === 'setup' || (await ask({ title: 'Spiel verlassen?', ok: 'Verlassen', cancel: 'Weiterspielen' }))) && (stopSong(), onLeave());

  let body;
  if (g.phase === 'setup') body = <Setup players={players} setPlayers={setPlayers} settings={settings} setSettings={setSettings} onStart={start} err={err} />;
  else if (g.phase === 'loading') body = <div className="thinking"><div className="dice">🎧</div><h2>Songs werden geladen …</h2></div>;
  else if (g.phase === 'final') body = <Final players={players} onAgain={start} onSetup={() => setG({ phase: 'setup' })} />;
  else body = (
    <LocalRound
      key={g.idx}
      song={g.songs[g.idx]}
      idx={g.idx}
      total={g.songs.length}
      players={players}
      onDone={(pid, pts) => {
        if (pid) setPlayers((ps) => ps.map((p) => (p.id === pid ? { ...p, score: p.score + pts } : p)));
      }}
      onNext={() => (g.idx + 1 >= g.songs.length ? setG({ ...g, phase: 'final' }) : setG({ ...g, idx: g.idx + 1 }))}
    />
  );

  return (
    <div className="wrap">
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Verlassen">←</button>
        <div className="row" style={{ gap: 8 }}>
          <div className="code-pill" style={{ letterSpacing: 1 }}>🎧 Ein Handy</div>
          {g.phase === 'play' && <button className="icon-btn" title="Spiel beenden" onClick={() => ask({ title: 'Spiel beenden?', text: 'Direkt zur Auswertung.', ok: 'Beenden', cancel: 'Weiterspielen' }).then((ok) => ok && (stopSong(), setG({ ...g, phase: 'final' })))}>🏁</button>}
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
        </div>
      </div>
      {body}
    </div>
  );
}

function LocalRound({ song, idx, total, players, onDone, onNext }) {
  const [state, setState] = useState('loading'); // loading | ready | playing | paused | reveal | error
  const [elapsed, setElapsed] = useState(0);
  const [winner, setWinner] = useState(null);
  const [pts, setPts] = useState(0);
  const started = useRef(0);
  const tick = useRef(null);

  useEffect(() => {
    let alive = true;
    loadSong(song.preview).then(() => alive && setState('ready')).catch(() => alive && setState('error'));
    return () => { alive = false; clearInterval(tick.current); stopSong(); };
  }, [song.preview]);

  const play = async () => {
    haptic('tap');
    try {
      const r = await playSong(song.preview, { from: 0, onEnd: () => setState((x) => (x === 'playing' ? 'paused' : x)) });
      started.current = performance.now();
      setElapsed(0);
      setState('playing');
      clearInterval(tick.current);
      tick.current = setInterval(() => setElapsed((performance.now() - started.current) / 1000), 100);
      void r;
    } catch { setState('error'); }
  };
  const pick = (p) => {
    const sec = (performance.now() - started.current) / 1000;
    const n = p ? LOCAL_POINTS(sec) : 0;
    clearInterval(tick.current);
    stopSong();
    setWinner(p);
    setPts(n);
    onDone(p?.id, n);
    setState('reveal');
    if (p) { sfx.correct(); haptic('success'); confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, zIndex: 100 }); } else sfx.wrong();
  };
  const nowPts = LOCAL_POINTS(elapsed);
  const cat = catName(song.cat);

  if (state === 'reveal') {
    return (
      <div className="stack">
        <div className="muted center" style={{ fontWeight: 800 }}>Song {idx + 1}/{total}</div>
        <div className="card center stack pop-in">
          <SongCover song={song} size={170} />
          <div className="display" style={{ fontSize: 30 }}>{song.title}</div>
          <div className="muted" style={{ fontWeight: 800 }}>{song.artist} · {cat?.icon} {cat?.name}</div>
          <div className="display" style={{ fontSize: 22, color: winner ? 'var(--green)' : 'var(--red)' }}>{winner ? `${winner.name} +${pts} 🎉` : 'Keiner hatte ihn 😬'}</div>
        </div>
        <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3><ScoreList players={players} /></div>
        <button className="btn big full pink" onClick={() => { sfx.pick(); onNext(); }}>{idx + 1 >= total ? 'Zur Auswertung 🏆' : 'Nächster Song ➜'}</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row between">
        <span className="muted" style={{ fontWeight: 800 }}>Song {idx + 1}/{total}</span>
        <span className="chip" style={{ background: 'var(--card2)' }}>{cat?.icon} {cat?.name}</span>
      </div>
      <div className="card center stack song-card">
        <div className={'song-disc' + (state === 'playing' ? ' spin' : '')}><span>🎵</span></div>
        {state === 'playing' || state === 'paused' ? (
          <>
            <div className="display" style={{ fontSize: 40 }}>{elapsed.toFixed(1).replace('.', ',')} s</div>
            <div className="muted" style={{ fontWeight: 800 }}>Wer zuerst richtig ruft, bekommt <b style={{ color: 'var(--yellow)' }}>{nowPts} {nowPts === 1 ? 'Punkt' : 'Punkte'}</b></div>
            {state === 'paused' && <button className="btn small ghost" onClick={play}>↺ Nochmal von vorn</button>}
          </>
        ) : (
          <button className="btn big full pink play-btn" disabled={state === 'loading'} onClick={state === 'error' ? () => { setState('loading'); loadSong(song.preview).then(() => setState('ready')).catch(() => setState('error')); } : play}>
            {state === 'loading' ? '⏳ Lädt …' : state === 'error' ? '⚠️ Nochmal laden' : '▶ Song abspielen'}
          </button>
        )}
      </div>
      {(state === 'playing' || state === 'paused') && (
        <div className="card stack">
          <b>Wer hatte ihn zuerst?</b>
          <div className="who-grid">
            {players.map((p) => (
              <button key={p.id} className="who-btn" onClick={() => pick(p)}>
                <Avatar avatar={p.avatar} size={48} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          <button className="btn ghost small" onClick={() => pick(null)}>🤷 Keiner – auflösen</button>
        </div>
      )}
    </div>
  );
}

function Setup({ players, setPlayers, settings, setSettings, onStart, err }) {
  const [name, setName] = useState('');
  const add = () => {
    const n = name.trim().slice(0, 16);
    if (!n) return;
    sfx.join();
    setPlayers((ps) => [...ps, { id: uid(), name: n, avatar: randomAvatar(), score: 0 }]);
    setName('');
  };
  const ok = players.length >= 2;
  return (
    <div className="stack">
      <h1 style={{ fontSize: 38 }}>Wer spielt mit?</h1>
      <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Ein Handy, alle hören zu. Du tippst an, wer den Song zuerst hatte.</p>
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
      <div className="card"><SongSettings settings={settings} online={false} onChange={(x) => setSettings((s) => ({ ...s, ...x }))} /></div>
      {err && <div className="err-box">{err}</div>}
      <SongRules online={false} />
      <button className="btn big full pink" disabled={!ok} onClick={onStart}>{ok ? 'Los jeht\'s 🎧' : 'Mindestens 2 Spieler'}</button>
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
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Unentschieden, wa? 🏆' : 'Musik-Profi 🎧👑'}</h1>
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
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Auswertung</h3><ScoreList players={players} /></div>
      <button className="btn big full pink" onClick={onAgain}>Nomma! 🎧</button>
      <button className="btn ghost full" onClick={onSetup}>Spieler ändern</button>
    </div>
  );
}
