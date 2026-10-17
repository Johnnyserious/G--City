'use client';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { DevBots } from './DevPanel';
import { ShopToggle } from './JokerBag';
import Avatar from './Avatar';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { SongSettings, SongRules, StageBar, StagePoints, PlayButton, SongCover, SongGuessInput, fmtSec, catName } from './SongParts';
import { sfx } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { STAGES, POINTS, MIN_PLAYERS, songFor, winners } from '@/lib/songs';
import { stopSong } from '@/lib/songAudio';

export default function SongRoom({ room, me, code }) {
  const { state: s } = room;
  useEffect(() => () => stopSong(), []);
  if (s.phase === 'lobby') return <Lobby room={room} me={me} code={code} />;
  if (s.phase === 'loading') return <div className="thinking"><div className="dice">🎧</div><h2>Songs werden geladen …</h2><p className="muted" style={{ fontWeight: 700 }}>Dauert ein paar Sekunden</p></div>;
  if (s.phase === 'final') return <Final room={room} me={me} />;
  return <Play room={room} me={me} />;
}

function Lobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const enough = onlineIds(s).length >= MIN_PLAYERS;
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Songs erraten', text: 'Komm zu Songs erraten in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>🎧 Songs erraten · Raum-Code</div>
        <div className="code-big">{code}</div>
        <button className="btn teal" onClick={invite}>{copied ? 'Link kopiert ✓' : '📨 Leute einladen'}</button>
      </div>
      <div className="card">
        <h3 style={{ fontSize: 24, marginBottom: 12 }}>Spieler ({players.length})</h3>
        <div className="players">
          {players.map((p) => (
            <div key={p.id} className="player-chip">
              <Avatar avatar={p.avatar} size={64} />
              <div className="name">{p.name}</div>
              {p.id === s.hostId && <span className="host-badge">HOST</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <SongSettings settings={s.settings} disabled={!isHost} onChange={(x) => send('settings', x)} />
        {!isHost && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Nur der Host kann das ändern.</div>}
      </div>
      {s.error && <div className="err-box">{s.error}</div>}
      <div className="card center muted" style={{ fontWeight: 800, fontSize: 14 }}>🔊 Ton an! Am iPhone: Lautstärke hoch – Kopfhörer gehen auch.</div>
      <DevBots room={room} me={me} />
      <ShopToggle room={room} me={me} />
      <SongRules />
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>Spiel starten 🎧</button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

function Play({ room, me }) {
  const { state: s, send, now } = room;
  const isHost = s.hostId === me.id;
  const left = useCountdown(s.deadline, s.phase === 'play', now);
  const song = songFor(s, me.id);
  const prog = s.prog[me.id];
  const players = s.order.map((id) => s.players[id]).filter((p) => p && (p.online || s.prog[p.id]));
  const lastTries = useRef(0);
  const [msg, setMsg] = useState('');

  useEffect(() => { lastTries.current = 0; setMsg(''); }, [s.round]);
  useEffect(() => {
    if (!prog) return;
    if (prog.tries.length > lastTries.current) {
      const t = prog.tries[prog.tries.length - 1];
      if (t.k === 'correct') { sfx.correct(); confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, zIndex: 100 }); setMsg(''); }
      else if (t.k === 'close') { sfx.joker(); setMsg('🔥 Ganz nah dran – nochmal genauer!'); }
      else if (t.k === 'artist') { sfx.joker(); setMsg('🎤 Der Interpret stimmt – aber welcher Song?'); }
      else { sfx.wrong(); setMsg(`❌ „${t.t}“ ist es nicht`); }
    }
    lastTries.current = prog.tries.length;
  }, [prog?.tries.length]); // eslint-disable-line

  if (s.phase === 'reveal') return <Reveal room={room} me={me} />;

  const top = (
    <>
      <div className="scorebar" style={{ marginBottom: 0 }}>
        {players.map((p) => {
          const pr = s.prog[p.id];
          return (
            <div key={p.id} className={'score-item' + (pr?.solved ? ' solved' : '')}>
              <Avatar avatar={p.avatar} size={30} />
              <span style={{ fontWeight: 800, fontSize: 13 }}>{pr?.solved ? '✅ ' : pr?.done ? '❌ ' : pr ? `${fmtSec(STAGES[pr.stage])} ` : ''}{p.name}</span>
              <span className="pts">{p.score}</span>
            </div>
          );
        })}
      </div>
      <div className="row between">
        <span className="chip" style={{ background: 'var(--card2)' }}>{s.settings.mode === 'same' ? '👥 Alle denselben' : '🎧 Dein Song'}</span>
        <span className="muted" style={{ fontWeight: 800 }}>Runde {s.round + 1}/{s.settings.rounds}</span>
        <span className="chip" style={{ background: left < 8 ? 'var(--red)' : 'var(--card2)' }}>{Math.ceil(left)} s</span>
      </div>
      <TimerBar left={left} total={s.settings.seconds} />
    </>
  );

  if (!song || !prog) {
    return <div className="stack">{top}<div className="card center" style={{ fontWeight: 800 }}>Du bist ab der nächsten Runde dabei 🎧</div></div>;
  }

  return (
    <div className="stack">
      {top}
      <div className="card stack center song-card">
        <div className="song-disc">{prog.solved ? <SongCover song={song} size={120} /> : <span>🎵</span>}</div>
        {prog.done ? (
          prog.solved ? (
            <div className="stack">
              <div className="display" style={{ fontSize: 28, color: 'var(--green)' }}>Richtig! +{prog.pts}</div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{song.title}</div>
              <div className="muted" style={{ fontWeight: 800 }}>{song.artist}</div>
              <div className="muted" style={{ fontWeight: 700 }}>Warte auf die anderen …</div>
            </div>
          ) : (
            <div className="stack">
              <div className="display" style={{ fontSize: 26, color: 'var(--red)' }}>Leider nicht 😬</div>
              <div className="muted" style={{ fontWeight: 700 }}>Auflösung gleich – warte auf die anderen …</div>
            </div>
          )
        ) : (
          <>
            <StageBar stage={prog.stage} />
            <PlayButton key={song.preview + prog.stage} url={song.preview} seconds={STAGES[prog.stage]} />
            <div className="muted" style={{ fontWeight: 800 }}>Jetzt richtig = <b style={{ color: 'var(--yellow)' }}>{POINTS[prog.stage]} Punkte</b></div>
          </>
        )}
      </div>

      {!prog.done && (
        <div className="card stack">
          {msg && <div className={'song-msg'}>{msg}</div>}
          <SongGuessInput onGuess={(text) => send('guess', { text })} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost small" style={{ flex: 1 }} onClick={() => { sfx.click(); send('skip', { stage: prog.stage }); }}>
              {prog.stage >= STAGES.length - 1 ? '🏳️ Aufgeben' : `⏭ Mehr hören (${fmtSec(STAGES[prog.stage + 1])})`}
            </button>
          </div>
          {prog.tries.length > 0 && (
            <div className="tries">
              {prog.tries.map((t, i) => <span key={i} className={'try ' + t.k}>{t.k === 'close' ? '🔥' : t.k === 'artist' ? '🎤' : '❌'} {t.t}</span>)}
            </div>
          )}
          <StagePoints stage={prog.stage} />
        </div>
      )}

      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('endRound')}>Runde auflösen ➜</button></div>}
    </div>
  );
}

function Reveal({ room, me }) {
  const { state: s, send, now } = room;
  const isHost = s.hostId === me.id;
  const left = useCountdown(s.deadline, true, now);
  const mine = songFor(s, me.id);
  const ids = s.inGame.filter((id) => s.prog[id]);
  const same = s.settings.mode === 'same';
  useEffect(() => { sfx.fanfare(); }, []);
  const results = ids.map((id) => ({ p: s.players[id], pr: s.prog[id], song: songFor(s, id) })).filter((x) => x.p).sort((a, b) => b.pr.pts - a.pr.pts);
  return (
    <div className="stack">
      <div className="row between">
        <span className="muted" style={{ fontWeight: 800 }}>Runde {s.round + 1}/{s.settings.rounds} · Auflösung</span>
        <span className="chip" style={{ background: 'var(--card2)' }}>{Math.ceil(left)} s</span>
      </div>
      {mine && (
        <div className="card center stack pop-in">
          <SongCover song={mine} size={150} />
          <div className="display" style={{ fontSize: 28 }}>{mine.title}</div>
          <div style={{ fontWeight: 800 }} className="muted">{mine.artist} · {catName(mine.cat)?.icon} {catName(mine.cat)?.name}</div>
          <PlayButton url={mine.preview} seconds={15} big={false} label="▶ Nochmal hören" />
        </div>
      )}
      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>So lief’s</h3>
        <div className="rank-list">
          {results.map(({ p, pr, song }) => (
            <div key={p.id}>
              <Avatar avatar={p.avatar} size={34} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{p.name}</b>
                {!same && song && <span className="muted" style={{ display: 'block', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title} – {song.artist}</span>}
              </span>
              <span className="meme-stat">{pr.solved ? `✅ ${fmtSec(STAGES[pr.stage])}` : '❌'}</span>
              <span className="meme-stat">+{pr.pts}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3><ScoreList players={s.order.map((id) => s.players[id]).filter(Boolean)} /></div>
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('next')}>{s.round + 1 >= s.settings.rounds ? 'Zum Endstand 🏆' : 'Nächste Runde ➜'}</button></div>}
    </div>
  );
}

function Final({ room, me }) {
  const { state: s, send } = room;
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const wins = winners(players);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    sfx.fanfare();
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, zIndex: 100 });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, zIndex: 100 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);
  return (
    <div className="stack">
      <div className="card center stack">
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Musik-Profi 🎧👑'}</h1>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
          {wins.map((p) => (
            <div key={p.id} className="player-chip" style={{ width: 96 }}>
              <Avatar avatar={p.avatar} size={84} />
              <div className="name" style={{ maxWidth: 96 }}>{p.name}</div>
              <span className="host-badge">{p.score} Punkte</span>
            </div>
          ))}
        </div>
        {wins.some((p) => p.id === me.id) && <div className="display" style={{ color: 'var(--green)', fontSize: 22 }}>Du hast gewonnen! 🎉</div>}
      </div>
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Endstand</h3><ScoreList players={players} /></div>
      {isHost ? (
        <div className="stack">
          <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nochmal 🎧</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen</button>
            <button className="btn small ghost" onClick={() => send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><SongSettings settings={s.settings} onChange={(x) => send('settings', x)} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host kann nochmal starten.</div>
      )}
    </div>
  );
}
