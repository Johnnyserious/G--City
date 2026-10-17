'use client';
import { useEffect, useRef, useState } from 'react';
import { DevBots } from './DevPanel';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import RevealCard, { SecretWord } from './RevealCard';
import { useCountdown, TimerBar, WordTable, ScoreList, ImposterSettings, RulesBox } from './ImposterParts';
import { sfx } from '@/lib/sound';
import { TURN_SECONDS, DISCUSS_SECONDS, GUESS_SECONDS, WORD_ROUNDS, MIN_PLAYERS, POINTS, currentSpeaker, tallyVotes } from '@/lib/imposter';
import { WORD_CATEGORIES, ALL_KEY } from '@/lib/imposterWords';
import { onlineIds } from '@/lib/engine';

const catLabel = (key) => (key === ALL_KEY ? '🎲 Alles gemischt' : (WORD_CATEGORIES.find((c) => c.key === key) || {}).name || key);

export default function ImposterRoom({ room, me, code }) {
  const { state: s, send } = room;
  const isHost = s.hostId === me.id;
  const lastPhase = useRef(null);

  useEffect(() => {
    if (lastPhase.current === s.phase) return;
    lastPhase.current = s.phase;
    if (s.phase === 'reveal') sfx.pick();
    if (s.phase === 'words' || s.phase === 'vote') sfx.joker();
    if (s.phase === 'discuss') sfx.chat();
  }, [s.phase]);

  const P = (id) => s.players[id];
  const inGame = (s.inGame || []).map(P).filter(Boolean);
  const playing = s.inGame?.includes(me.id);

  if (s.phase === 'lobby') return <ImpLobby room={room} me={me} code={code} />;
  if (!playing && s.phase !== 'result') {
    return (
      <div className="card center stack">
        <div style={{ fontSize: 54 }}>👀</div>
        <h2>Gerade läuft eine Runde</h2>
        <p className="muted">Du bist in der nächsten Runde dabei.</p>
        <WordTable players={(s.speakOrder?.length ? s.speakOrder : s.inGame).map(P).filter(Boolean)} words={s.words} currentId={s.phase === 'words' ? currentSpeaker(s) : null} currentRound={s.wordRound} />
      </div>
    );
  }

  const imp = s.imposters.includes(me.id);
  const secret = <SecretWord imposter={imp} word={s.secret?.word} tip={s.secret?.tip} category={s.secret?.icon + ' ' + s.secret?.category} />;

  switch (s.phase) {
    case 'reveal':
      return <RevealPhase s={s} me={me} send={send} isHost={isHost} secret={secret} inGame={inGame} />;
    case 'words':
      return <WordsPhase room={room} me={me} secret={secret} />;
    case 'discuss':
      return <DiscussPhase room={room} me={me} isHost={isHost} secret={secret} />;
    case 'vote':
      return <VotePhase room={room} me={me} isHost={isHost} inGame={inGame} />;
    case 'guess':
      return <GuessPhase room={room} me={me} />;
    case 'result':
      return <ResultPhase room={room} me={me} isHost={isHost} />;
    default:
      return null;
  }
}

// ---------------- Lobby ----------------
function ImpLobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const host = s.players[s.hostId];
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const enough = onlineIds(s).length >= MIN_PLAYERS;

  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Imposter', text: 'Komm zu Imposter in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>🕵️ Imposter · Raum-Code</div>
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
        <ImposterSettings settings={s.settings} disabled={!isHost} playerCount={players.length} onChange={(x) => send('settings', x)} />
        {!isHost && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Nur der Host kann das ändern.</div>}
      </div>
      <DevBots room={room} me={me} />
      <RulesBox />
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>
          {enough ? 'Spiel starten 🕵️' : `Mindestens ${MIN_PLAYERS} Spieler nötig`}
        </button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {host?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

// ---------------- Karte ansehen ----------------
function RevealPhase({ s, me, send, isHost, secret, inGame }) {
  const [seen, setSeen] = useState(false);
  const ready = !!s.ready[me.id];
  return (
    <div className="stack">
      <h2 className="center" style={{ fontSize: 30 }}>Runde {s.roundNo}: Deine Karte</h2>
      <p className="center muted" style={{ margin: 0, fontWeight: 700 }}>Handy verdecken, Karte antippen, Wort merken.</p>
      <RevealCard
        onRevealed={() => setSeen(true)}
        secret={secret}
        cover={<div className="cover-face"><Avatar avatar={me.avatar} size={110} /><div className="display" style={{ fontSize: 28 }}>{me.name}</div></div>}
      />
      <button className="btn big full green" disabled={!seen || ready} onClick={() => { sfx.vote(); send('ready'); }}>
        {ready ? 'Bereit ✓ – warte auf die anderen' : seen ? 'Hab’s mir gemerkt ✓' : 'Erst Karte aufdecken 👆'}
      </button>
      <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {inGame.map((p) => (
          <div key={p.id} style={{ opacity: s.ready[p.id] ? 1 : 0.35, position: 'relative' }}>
            <Avatar avatar={p.avatar} size={40} />
            {s.ready[p.id] && <span style={{ position: 'absolute', right: -4, bottom: -4 }}>✅</span>}
          </div>
        ))}
      </div>
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('skipReveal')}>Nicht warten, los geht’s ➜</button></div>}
    </div>
  );
}

// Eigenes Wort nochmal ansehen (aufklappbar)
function PeekCard({ me, secret }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="center">
      <button className="btn small ghost" onClick={() => setOpen(!open)}>{open ? 'Karte zu ✕' : '🃏 Meine Karte nochmal'}</button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <RevealCard height={260} secret={secret} cover={<div className="cover-face"><Avatar avatar={me.avatar} size={64} /><b>{me.name}</b></div>} />
        </div>
      )}
    </div>
  );
}

// ---------------- Wörter sagen ----------------
function WordsPhase({ room, me, secret }) {
  const { state: s, send, now } = room;
  const speaker = currentSpeaker(s);
  const mine = speaker === me.id;
  const left = useCountdown(s.deadline, true, now);
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const sp = s.players[speaker];

  useEffect(() => {
    setText('');
    if (mine) { sfx.pick(); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [mine, s.turnIdx, s.wordRound]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    sfx.pop();
    send('word', { text: t });
    setText('');
  };

  return (
    <div className="stack">
      <div className="row between">
        <h2 style={{ fontSize: 26 }}>Runde {s.wordRound}/{WORD_ROUNDS}</h2>
        <span className="chip" style={{ background: 'var(--card2)' }}>{s.secret?.icon} {s.secret?.category}</span>
      </div>
      <div className={'card center' + (mine ? ' my-turn' : '')}>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Avatar avatar={sp?.avatar} size={44} />
          <div className="display" style={{ fontSize: 24 }}>{mine ? 'Du bist dran!' : `${sp?.name || '…'} ist dran`}</div>
        </div>
        <div style={{ marginTop: 10 }}><TimerBar left={left} total={TURN_SECONDS} /></div>
        {mine ? (
          <div className="row">
            <input
              ref={inputRef}
              className="input"
              maxLength={30}
              placeholder="Ein Wort …"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoComplete="off"
            />
            <button className="btn teal" disabled={!text.trim()} onClick={submit}>➜</button>
          </div>
        ) : (
          <div className="muted" style={{ fontWeight: 800 }}>{Math.ceil(left)} s · Merk dir, was gesagt wird 👀</div>
        )}
      </div>
      <WordTable players={s.speakOrder.map((id) => s.players[id]).filter(Boolean)} words={s.words} currentId={speaker} currentRound={s.wordRound} />
      <PeekCard me={me} secret={secret} />
    </div>
  );
}

// ---------------- Kurz diskutieren ----------------
export function InlineChat({ room, me, placeholder = 'Erklär dich …' }) {
  const { messages, sendChat } = room;
  const [text, setText] = useState('');
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages]);
  const submit = () => {
    if (!text.trim()) return;
    sendChat(text.trim());
    setText('');
  };
  return (
    <div className="card inline-chat">
      <div className="chat-msgs" ref={listRef}>
        {messages.length === 0 && <div className="muted center" style={{ marginTop: 20, fontWeight: 700 }}>Wer war verdächtig? Schreib was 👇</div>}
        {messages.map((m) => (
          <div key={m.id} className={'msg' + (m.pid === me.id ? ' me' : '')}>
            <Avatar avatar={m.avatar} size={28} />
            <div className="bubble">
              {m.pid !== me.id && <div className="who">{m.name}</div>}
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input value={text} maxLength={200} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="btn small teal" onClick={submit}>➜</button>
      </div>
    </div>
  );
}

function DiscussPhase({ room, me, isHost, secret }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  return (
    <div className="stack">
      <h2 className="center" style={{ fontSize: 30 }}>Wer ist der Imposter? 🤔</h2>
      <TimerBar left={left} total={DISCUSS_SECONDS} />
      <p className="center muted" style={{ margin: 0, fontWeight: 800 }}>{Math.ceil(left)} s zum Erklären, dann wird abgestimmt.</p>
      <WordTable players={s.speakOrder.map((id) => s.players[id]).filter(Boolean)} words={s.words} />
      <InlineChat room={room} me={me} />
      <PeekCard me={me} secret={secret} />
      {isHost && <button className="btn full pink" onClick={() => { sfx.click(); send('endDiscuss'); }}>Jetzt abstimmen 🗳️</button>}
    </div>
  );
}

// ---------------- Abstimmung ----------------
function VotePhase({ room, me, isHost, inGame }) {
  const { state: s, send } = room;
  const my = s.votes[me.id];
  const votedCount = inGame.filter((p) => s.votes[p.id]).length;
  return (
    <div className="stack">
      <h2 className="center" style={{ fontSize: 30 }}>Abstimmung 🗳️</h2>
      <p className="center muted" style={{ margin: 0, fontWeight: 800 }}>Wen schmeißt ihr raus? ({votedCount}/{inGame.length} haben gewählt)</p>
      <div className="vote-grid">
        {inGame.filter((p) => p.id !== me.id).map((p) => (
          <button key={p.id} className={'vote-card' + (my === p.id ? ' on' : '')} onClick={() => { sfx.vote(); send('vote', { target: p.id }); }}>
            <Avatar avatar={p.avatar} size={64} />
            <b>{p.name}</b>
          </button>
        ))}
        {s.settings.imposters === 'random' && (
          <button className={'vote-card' + (my === 'none' ? ' on' : '')} onClick={() => { sfx.vote(); send('vote', { target: 'none' }); }}>
            <div style={{ fontSize: 54, lineHeight: '64px' }}>🤷</div>
            <b>Keiner</b>
          </button>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {inGame.map((p) => (
          <div key={p.id} style={{ opacity: s.votes[p.id] ? 1 : 0.35, position: 'relative' }}>
            <Avatar avatar={p.avatar} size={36} />
            {s.votes[p.id] && <span style={{ position: 'absolute', right: -4, bottom: -4 }}>🗳️</span>}
          </div>
        ))}
      </div>
      <WordTable players={s.speakOrder.map((id) => s.players[id]).filter(Boolean)} words={s.words} />
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('forceVote')}>Nicht warten, auswerten ➜</button></div>}
    </div>
  );
}

// ---------------- Imposter darf raten ----------------
function GuessPhase({ room, me }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  const acc = s.players[s.accused];
  const mine = s.accused === me.id;
  const [text, setText] = useState('');
  useEffect(() => { sfx.correct(); }, []);
  return (
    <div className="stack center">
      <div style={{ fontSize: 64 }}>🚨</div>
      <h2 style={{ fontSize: 30 }}>{mine ? 'Erwischt! Aber du hast noch eine Chance' : `${acc?.name} war Imposter!`}</h2>
      <Avatar avatar={acc?.avatar} size={90} style={{ margin: '0 auto' }} />
      <TimerBar left={left} total={GUESS_SECONDS} />
      {mine ? (
        <div className="card stack">
          <b>Rate das geheime Wort. Triffst du, gewinnst du trotzdem.</b>
          <div className="row">
            <input className="input" autoFocus maxLength={40} placeholder="Das Wort war …" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && send('guess', { text })} />
            <button className="btn teal" disabled={!text.trim()} onClick={() => send('guess', { text })}>➜</button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontWeight: 800 }}>{acc?.name} darf noch das Wort raten … {Math.ceil(left)} s</p>
      )}
    </div>
  );
}

// ---------------- Ergebnis ----------------
function ResultPhase({ room, me, isHost }) {
  const { state: s, send } = room;
  const imps = s.imposters.map((id) => s.players[id]).filter(Boolean);
  const amImp = s.imposters.includes(me.id);
  const playing = s.inGame.includes(me.id);
  const won = playing && ((s.outcome === 'crew' && !amImp) || (s.outcome === 'imposter' && amImp));
  const { tally } = tallyVotes(s.votes);
  const acc = s.accused && s.accused !== 'none' ? s.players[s.accused] : null;
  const allPlayers = s.order.map((id) => s.players[id]).filter(Boolean);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (won) {
      sfx.fanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, zIndex: 100 });
    } else if (playing) sfx.wrong();
  }, [s.roundNo, s.outcome]); // eslint-disable-line

  let headline;
  if (s.outcome === 'crew') headline = imps.length ? 'Crew gewinnt! 🎉' : 'Richtig – es gab keinen Imposter! 🎉';
  else if (s.outcome === 'imposter') headline = imps.length > 1 ? 'Die Imposter gewinnen! 😈' : 'Der Imposter gewinnt! 😈';
  else headline = 'Ups – es gab gar keinen Imposter 🙈';

  let why = '';
  if (s.guess != null && s.accused && s.imposters.includes(s.accused)) {
    why = s.outcome === 'imposter' ? `${acc?.name} wurde erwischt, hat aber das Wort erraten („${s.guess}“).` : `${acc?.name} wurde erwischt und hat ${s.guess ? `„${s.guess}“` : 'nichts'} geraten – falsch!`;
  } else if (s.accused === 'none') why = 'Ihr habt auf „Keiner“ getippt.';
  else if (!s.accused) why = 'Gleichstand bei der Abstimmung – keiner flog raus.';
  else if (acc) why = `Ihr habt ${acc.name} rausgeworfen – ${s.imposters.includes(s.accused) ? 'Treffer.' : 'der war unschuldig.'}`;

  return (
    <div className="stack">
      <div className="card center stack">
        <h1 style={{ fontSize: 38 }}>{headline}</h1>
        {playing && <div className="display" style={{ fontSize: 22, color: won ? 'var(--green)' : 'var(--red)' }}>{won ? `Du hast gewonnen (+${amImp ? POINTS.imposter : POINTS.crew})` : 'Du hast verloren'}</div>}
        <p className="muted" style={{ margin: 0, fontWeight: 800 }}>{why}</p>
        <div className="answer-box">
          <div>Das Wort war <b className="secret-word blue" style={{ fontSize: 26 }}>{s.secret?.word}</b></div>
          <div className="muted" style={{ fontWeight: 700 }}>Tipp für den Imposter: <span style={{ color: '#ff7a86', fontWeight: 900 }}>{s.secret?.tip}</span></div>
        </div>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {imps.length ? imps.map((p) => (
            <div key={p.id} className="player-chip"><Avatar avatar={p.avatar} size={64} /><div className="name">{p.name}</div><span className="host-badge" style={{ background: 'var(--red)', color: '#fff' }}>IMPOSTER</span></div>
          )) : <b>Kein Imposter in dieser Runde</b>}
        </div>
        {isHost && s.outcome === 'crew' && s.guess && !s.guessAccepted && (
          <button className="btn small ghost" onClick={() => confirm('Geratenes Wort doch als richtig zählen?') && send('acceptGuess')}>Geraten zählt doch ✓</button>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>Wer hat wen gewählt?</h3>
        <div className="stack" style={{ fontWeight: 700 }}>
          {s.inGame.filter((id) => s.votes[id]).map((id) => (
            <div key={id} className="row" style={{ gap: 6 }}>
              <Avatar avatar={s.players[id]?.avatar} size={26} /> {s.players[id]?.name} ➜ {s.votes[id] === 'none' ? '🤷 Keiner' : s.players[s.votes[id]]?.name}
              {s.votes[id] !== 'none' && s.imposters.includes(s.votes[id]) ? ' ✅' : ''}
            </div>
          ))}
          {!Object.keys(tally).length && <div className="muted">Keine Stimmen abgegeben.</div>}
        </div>
      </div>

      <WordTable players={(s.speakOrder || []).map((id) => s.players[id]).filter(Boolean)} words={s.words} />

      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 4 }}>Punktestand</h3>
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Crew-Sieg +{POINTS.crew} pro Person · Imposter-Sieg +{POINTS.imposter}</div>
        <ScoreList players={allPlayers} />
      </div>

      {isHost ? (
        <div className="stack">
          <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nächste Runde 🕵️</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen ({catLabel(s.settings.category)})</button>
            <button className="btn small ghost" onClick={() => confirm('Zurück in die Lobby? Punkte werden zurückgesetzt.') && send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><ImposterSettings settings={s.settings} playerCount={onlineIds(s).length} onChange={(x) => send('settings', x)} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host startet die nächste Runde.</div>
      )}
    </div>
  );
}
