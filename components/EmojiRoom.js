'use client';
import { useEffect, useRef, useState } from 'react';
import { revealFor } from '@/lib/shopGame';
import { maskWord } from '@/lib/draw';
import JokerBag, { ShopToggle } from './JokerBag';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { sfx } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { EMOJI_TOPICS } from '@/lib/emojiPuzzles';
import { MIN_PLAYERS, COUNT_OPTIONS, SECOND_OPTIONS, PLACE_POINTS, ALL, emojiHint, winners } from '@/lib/emoji';

const topicOf = (key) => EMOJI_TOPICS.find((t) => t.key === key) || { name: '', icon: '🎲' };

export default function EmojiRoom({ room, me, code }) {
  const { state: s } = room;
  if (s.phase === 'lobby') return <EmojiLobby room={room} me={me} code={code} />;
  if (s.phase === 'final') return <Final room={room} me={me} />;
  return <Play room={room} me={me} />;
}

function Settings({ s, send, disabled }) {
  const all = !s.settings.topics?.length || s.settings.topics.includes(ALL);
  const toggle = (key) => {
    sfx.click();
    if (key === ALL) return send('settings', { topics: [ALL] });
    const cur = all ? [] : s.settings.topics;
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    send('settings', { topics: next.length ? next : [ALL] });
  };
  return (
    <div className="stack">
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Rätsel</div>
        <div className="seg">
          {COUNT_OPTIONS.map((n) => (
            <button key={n} className={'seg-btn' + (s.settings.count === n ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { count: n }); }}>{n} Rätsel</button>
          ))}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Zeit pro Rätsel</div>
        <div className="seg">
          {SECOND_OPTIONS.map((t) => (
            <button key={t} className={'seg-btn' + (s.settings.seconds === t ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { seconds: t }); }}>{t} s</button>
          ))}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Themen (mehrere möglich)</div>
        <div className="seg seg-wrap">
          <button className={'seg-btn' + (all ? ' on' : '')} disabled={disabled} onClick={() => toggle(ALL)}>🎲 Alles gemischt</button>
          {EMOJI_TOPICS.map((t) => (
            <button key={t.key} className={'seg-btn' + (!all && s.settings.topics.includes(t.key) ? ' on' : '')} disabled={disabled} onClick={() => toggle(t.key)}>{t.icon} {t.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmojiLobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const enough = onlineIds(s).length >= MIN_PLAYERS;
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Emoji-Rätsel', text: 'Komm zum Emoji-Rätsel in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>🦁 Emoji-Rätsel · Raum-Code</div>
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
        <Settings s={s} send={send} disabled={!isHost} />
        {!isHost && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Nur der Host kann das ändern.</div>}
      </div>
      <ShopToggle room={room} me={me} />
      <details className="card rules">
        <summary className="display" style={{ fontSize: 20 }}>So geht’s 📖</summary>
        <ol>
          <li>Es erscheinen 2–3 Emojis. Was ist gemeint – ein Wort, ein Film, eine Marke?</li>
          <li>Alle tippen gleichzeitig. Falsche Tipps sehen alle, richtige bleiben geheim.</li>
          <li>Wer zuerst richtig liegt, bekommt {PLACE_POINTS[0]} Punkte, dann {PLACE_POINTS[1]}, dann {PLACE_POINTS[2]}, danach je 1.</li>
          <li>Nach einer Weile kommt die Anzahl der Buchstaben, später der erste Buchstabe als Tipp.</li>
        </ol>
      </details>
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>
          {enough ? 'Spiel starten 🦁' : `Mindestens ${MIN_PLAYERS} Spieler nötig`}
        </button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

function Play({ room, me }) {
  const { state: s, send, now } = room;
  const pz = s.puzzles[s.idx];
  const isHost = s.hostId === me.id;
  const left = useCountdown(s.deadline, s.phase === 'play', now);
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const feedRef = useRef(null);
  const lastCount = useRef(0);
  const mySolve = s.solved.find((x) => x.pid === me.id);
  const players = s.order.map((id) => s.players[id]).filter((p) => p && p.online);
  const boughtHint = revealFor(s, me.id, s.idx);
  const hint = boughtHint ? maskWord(pz.a, [0, 1]) : emojiHint(pz, s.hint);
  const t = topicOf(pz.topic);

  useEffect(() => { setText(''); sfx.pick(); setTimeout(() => inputRef.current?.focus(), 100); }, [s.idx]);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    if (s.guesses.length > lastCount.current) {
      const g = s.guesses[s.guesses.length - 1];
      if (g.pid === me.id) g.kind === 'correct' ? sfx.correct() : g.kind === 'close' ? sfx.joker() : sfx.wrong();
      else if (g.kind === 'correct') sfx.vote();
    }
    lastCount.current = s.guesses.length;
  }, [s.guesses, me.id]);
  useEffect(() => { if (s.phase === 'reveal' && !mySolve) sfx.wrong(); }, [s.phase]); // eslint-disable-line

  const guess = () => {
    const v = text.trim();
    if (!v) return;
    send('guess', { text: v });
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="stack">
      <div className="scorebar" style={{ marginBottom: 0 }}>
        {players.map((p) => {
          const sv = s.solved.find((x) => x.pid === p.id);
          return (
            <div key={p.id} className={'score-item' + (sv ? ' solved' : '')}>
              <Avatar avatar={p.avatar} size={30} />
              <span style={{ fontWeight: 800, fontSize: 13 }}>{sv ? '✅ ' : ''}{p.name}</span>
              <span className="pts">{p.score}</span>
            </div>
          );
        })}
      </div>
      <div className="row between">
        <span className="chip" style={{ background: 'var(--card2)' }}>{t.icon} {t.name}</span>
        <span className="muted" style={{ fontWeight: 800 }}>Rätsel {s.idx + 1}/{s.puzzles.length}</span>
        <span className="chip" style={{ background: left < 8 && s.phase === 'play' ? 'var(--red)' : 'var(--card2)' }}>{s.phase === 'play' ? Math.ceil(left) + ' s' : '✓'}</span>
      </div>
      {s.phase === 'play' && <TimerBar left={left} total={s.settings.seconds} />}

      <div className="card center emoji-card">
        <div className="emoji-big" key={s.idx}>{pz.e}</div>
        {s.phase === 'play' ? (
          hint ? <div className="mask" style={{ justifyContent: 'center' }}>{hint.map((c, i) => <span key={i} className={c === ' ' ? 'gap' : ''}>{c}</span>)}</div> : <div className="muted" style={{ fontWeight: 800 }}>Was ist gemeint?</div>
        ) : (
          <div className="stack">
            <div className="display" style={{ fontSize: 30, color: 'var(--yellow)' }}>{pz.a}</div>
            <div className="muted" style={{ fontWeight: 800 }}>
              {s.solved.length ? s.solved.map((x) => `${s.players[x.pid]?.name} +${x.pts}`).join(' · ') : 'Keiner hat’s erraten 😬'}
            </div>
          </div>
        )}
      </div>

      <div className="card guess-card">
        <div className="guess-feed" ref={feedRef}>
          {s.guesses.length === 0 && <div className="muted center" style={{ fontWeight: 700, padding: 8 }}>Tipp los! Mehrere Versuche sind erlaubt.</div>}
          {s.guesses.map((g, i) => (
            <div key={i} className={'guess-line ' + g.kind}>
              <b>{s.players[g.pid]?.name}</b>{' '}
              {g.kind === 'correct' ? `hat’s! 🎉 (+${s.solved.find((x) => x.pid === g.pid)?.pts || 1})` : g.kind === 'close' ? 'ist ganz nah dran! 🔥' : g.text}
            </div>
          ))}
        </div>
        {s.phase === 'play' && !mySolve && (
          <div className="chat-input" style={{ padding: '8px 0 0' }}>
            <input ref={inputRef} value={text} maxLength={50} placeholder="Dein Tipp …" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guess()} autoComplete="off" autoCapitalize="off" />
            <button className="btn small teal" onClick={guess}>➜</button>
          </div>
        )}
        {s.phase === 'play' && !mySolve && <div style={{ marginTop: 8 }}><JokerBag room={room} me={me} items={['emoji_letters']} /></div>}
        {s.phase === 'play' && mySolve && <div className="center" style={{ fontWeight: 900, color: 'var(--green)', marginTop: 8 }}>Richtig! +{mySolve.pts} – warte auf die anderen …</div>}
      </div>

      {isHost && (
        <div className="center">
          {s.phase === 'play' ? (
            <button className="btn small ghost" onClick={() => send('skip')}>Auflösen ➜</button>
          ) : (
            <button className="btn small ghost" onClick={() => send('next')}>{s.idx + 1 >= s.puzzles.length ? 'Zum Endstand 🏆' : 'Nächstes Rätsel ➜'}</button>
          )}
        </div>
      )}
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
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Emoji-Profi 🦁👑'}</h1>
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
          <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nochmal 🦁</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen</button>
            <button className="btn small ghost" onClick={() => send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><Settings s={s} send={send} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host kann nochmal starten.</div>
      )}
    </div>
  );
}
