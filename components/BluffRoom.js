'use client';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { BluffSettings, BluffRules, QuestionBox, OptionPicker, RevealList } from './BluffParts';
import { sfx } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { MIN_PLAYERS, CHOOSE_SECONDS, isTruth, winners } from '@/lib/bluff';

export default function BluffRoom({ room, me, code }) {
  const { state: s } = room;
  const last = useRef(null);
  useEffect(() => {
    const k = s.phase + s.qIdx;
    if (last.current === k) return;
    last.current = k;
    if (s.phase === 'write') sfx.pick();
    if (s.phase === 'choose') sfx.joker();
  }, [s.phase, s.qIdx]);

  if (s.phase === 'lobby') return <BluffLobby room={room} me={me} code={code} />;
  if (s.phase === 'loading') return <div className="thinking"><div className="dice">🤥</div><h2>Fragen werden gemischt …</h2></div>;
  if (s.phase === 'final') return <Final room={room} me={me} />;
  if (!s.inGame.includes(me.id)) {
    return <div className="card center stack"><div style={{ fontSize: 54 }}>👀</div><h2>Gerade läuft eine Frage</h2><p className="muted">Bei der nächsten Frage bist du dabei.</p></div>;
  }
  const q = s.qs[s.qIdx];
  return (
    <div className="stack">
      <QuestionBox q={q} idx={s.qIdx} total={s.qs.length} />
      {s.phase === 'write' && <Write room={room} me={me} q={q} />}
      {s.phase === 'choose' && <Choose room={room} me={me} />}
      {s.phase === 'reveal' && <Reveal room={room} me={me} q={q} />}
    </div>
  );
}

function BluffLobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const enough = onlineIds(s).length >= MIN_PLAYERS;
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Lügen-Quiz', text: 'Komm zum Lügen-Quiz in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>🤥 Lügen-Quiz · Raum-Code</div>
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
        <BluffSettings settings={s.settings} disabled={!isHost} onChange={(x) => send('settings', x)} />
        {!isHost && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Nur der Host kann das ändern.</div>}
      </div>
      <BluffRules />
      {s.error && <div className="idea-error">Fragen konnten nicht geladen werden: {s.error}</div>}
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>
          {enough ? 'Spiel starten 🤥' : `Mindestens ${MIN_PLAYERS} Spieler nötig`}
        </button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

function Waiting({ s, done }) {
  return (
    <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
      {s.inGame.map((id) => (
        <div key={id} style={{ opacity: done(id) ? 1 : 0.35, position: 'relative' }}>
          <Avatar avatar={s.players[id]?.avatar} size={36} />
          {done(id) && <span style={{ position: 'absolute', right: -4, bottom: -4 }}>✅</span>}
        </div>
      ))}
    </div>
  );
}

function Write({ room, me, q }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  const [text, setText] = useState('');
  const [warn, setWarn] = useState('');
  const mine = s.lies[me.id];
  const isHost = s.hostId === me.id;
  useEffect(() => { setText(''); setWarn(''); }, [s.qIdx]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (isTruth(t, q)) {
      sfx.wrong();
      setWarn('Psst – das ist (fast) die richtige Antwort! 😏 Denk dir was anderes aus, dann bekommst du sie auch nicht geschenkt.');
      return;
    }
    setWarn('');
    sfx.correct();
    send('lie', { text: t });
  };

  return (
    <>
      <TimerBar left={left} total={s.settings.seconds} />
      {mine ? (
        <div className="card center stack">
          <div className="muted" style={{ fontWeight: 800 }}>Deine Lüge</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{mine}</div>
          <div className="muted" style={{ fontWeight: 700 }}>Warte auf die anderen … {Math.ceil(left)} s</div>
          <div><button className="btn small ghost" onClick={() => { setText(mine); send('unlie'); }}>✏️ Ändern</button></div>
        </div>
      ) : (
        <div className="card stack">
          <b>Erfinde eine Antwort, die echt klingt:</b>
          <div className="row">
            <input className="input" autoFocus maxLength={60} placeholder="Deine Lüge …" value={text} onChange={(e) => { setText(e.target.value); setWarn(''); }} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="off" />
            <button className="btn teal" disabled={!text.trim()} onClick={submit}>➜</button>
          </div>
          {warn && <div className="hint-box" style={{ margin: 0 }}>{warn}</div>}
          <div className="muted" style={{ fontWeight: 800, fontSize: 14 }}>{Math.ceil(left)} s</div>
        </div>
      )}
      <Waiting s={s} done={(id) => !!s.lies[id]} />
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('endWrite')}>Nicht warten, weiter ➜</button></div>}
    </>
  );
}

function Choose({ room, me }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  const isHost = s.hostId === me.id;
  return (
    <>
      <TimerBar left={left} total={CHOOSE_SECONDS} />
      <b className="center" style={{ display: 'block' }}>Welche Antwort ist echt? 🕵️ ({Math.ceil(left)} s)</b>
      <div className="muted center" style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>Mit 👍 kannst du lustige Lügen belohnen.</div>
      <OptionPicker
        options={s.options}
        myId={me.id}
        picked={s.picks[me.id]}
        liked={s.likes[me.id] || []}
        onPick={(id) => send('pick', { option: id })}
        onLike={(id) => send('like', { option: id })}
      />
      <Waiting s={s} done={(id) => !!s.picks[id]} />
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('endChoose')}>Auflösen ➜</button></div>}
    </>
  );
}

function Reveal({ room, me, q }) {
  const { state: s, send } = room;
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const mine = s.roundPoints[me.id] || 0;
  const found = s.options.find((o) => o.id === s.picks[me.id])?.truth;
  useEffect(() => { found ? sfx.correct() : sfx.wrong(); }, []); // eslint-disable-line
  return (
    <>
      <div className="card center stack">
        <div style={{ fontSize: 44 }}>{found ? '🎯' : '🙈'}</div>
        <div className="display" style={{ fontSize: 26 }}>{found ? 'Wahrheit gefunden!' : s.picks[me.id] ? 'Reingelegt!' : 'Nicht gewählt'}</div>
        <div className="display" style={{ fontSize: 22, color: mine ? 'var(--green)' : 'var(--muted)' }}>+{mine} Punkte</div>
        {q.explanation && <div className="answer-box" style={{ fontWeight: 700 }}>💡 {q.explanation}</div>}
      </div>
      <RevealList options={s.options} picks={s.picks} likes={s.likes} players={players} myId={me.id} onLike={(id) => send('like', { option: id })} />
      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3>
        <ScoreList players={players} />
      </div>
      {isHost ? (
        <button className="btn big full pink" onClick={() => { sfx.pick(); send('next'); }}>{s.qIdx + 1 >= s.qs.length ? 'Zum Endstand 🏆' : 'Nächste Frage ➜'}</button>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host geht gleich weiter.</div>
      )}
    </>
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
        {wins.some((p) => p.id === me.id) && <div className="display" style={{ color: 'var(--green)', fontSize: 22 }}>Du hast gewonnen! 🎉</div>}
      </div>
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Endstand</h3><ScoreList players={players} /></div>
      {isHost ? (
        <div className="stack">
          <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nochmal 🤥</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen</button>
            <button className="btn small ghost" onClick={() => send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><BluffSettings settings={s.settings} onChange={(x) => send('settings', x)} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host kann nochmal starten.</div>
      )}
    </div>
  );
}
