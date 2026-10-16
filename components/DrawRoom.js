'use client';
import { useEffect, useRef, useState } from 'react';
import { revealFor } from '@/lib/shopGame';
import JokerBag, { ShopToggle } from './JokerBag';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import DrawCanvas from './DrawCanvas';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { sfx } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { MIN_PLAYERS, ROUND_OPTIONS, SECOND_OPTIONS, CHOOSE_SECONDS, MULT, maskWord, winners } from '@/lib/draw';

const LEVEL = { 1: 'leicht', 2: 'mittel', 3: 'schwer' };

export default function DrawRoom({ room, me, code }) {
  const { state: s } = room;
  const last = useRef(null);
  useEffect(() => {
    const key = s.phase + s.turnId;
    if (last.current === key) return;
    last.current = key;
    if (s.phase === 'choose' && s.drawer === me.id) sfx.pick();
    if (s.phase === 'draw') sfx.joker();
  }, [s.phase, s.turnId, s.drawer, me.id]);

  if (s.phase === 'lobby') return <DrawLobby room={room} me={me} code={code} />;
  if (s.phase === 'final') return <Final room={room} me={me} />;
  return <Turn room={room} me={me} />;
}

function Settings({ s, send, disabled }) {
  return (
    <div className="stack">
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Runden (jeder malt pro Runde einmal)</div>
        <div className="seg">
          {ROUND_OPTIONS.map((r) => (
            <button key={r} className={'seg-btn' + (s.settings.rounds === r ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { rounds: r }); }}>{r} {r === 1 ? 'Runde' : 'Runden'}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Zeit zum Malen</div>
        <div className="seg">
          {SECOND_OPTIONS.map((t) => (
            <button key={t} className={'seg-btn' + (s.settings.seconds === t ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { seconds: t }); }}>{t} s</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrawLobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const enough = onlineIds(s).length >= MIN_PLAYERS;
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Zeichenspiel', text: 'Komm zum Zeichenspiel in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>🎨 Zeichenspiel · Raum-Code</div>
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
          <li>Reihum malt einer. Er sucht sich eins von 3 Wörtern aus – schwerer gibt mehr Punkte.</li>
          <li>Alle anderen sehen live mit und tippen ihre Tipps ein. Wer zuerst das richtige Wort hat, bekommt die Punkte – je schneller, desto mehr.</li>
          <li>Der Maler bekommt auch Punkte, wenn jemand es errät. Nach der Hälfte der Zeit werden Buchstaben aufgedeckt.</li>
          <li>Keine Buchstaben oder Zahlen malen 😉</li>
        </ol>
      </details>
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>
          {enough ? 'Spiel starten 🎨' : `Mindestens ${MIN_PLAYERS} Spieler nötig`}
        </button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

function Players({ s }) {
  const list = s.order.map((id) => s.players[id]).filter((p) => p && p.online);
  return (
    <div className="scorebar" style={{ marginBottom: 0 }}>
      {list.map((p) => (
        <div key={p.id} className={'score-item' + (p.id === s.drawer ? ' turn' : '')}>
          <Avatar avatar={p.avatar} size={30} />
          <span style={{ fontWeight: 800, fontSize: 13 }}>{p.id === s.drawer ? '✏️ ' : ''}{p.name}</span>
          <span className="pts">{p.score}</span>
        </div>
      ))}
    </div>
  );
}

function Turn({ room, me }) {
  const { state: s, send, now } = room;
  const isDrawer = s.drawer === me.id;
  const isHost = s.hostId === me.id;
  const drawer = s.players[s.drawer];
  const left = useCountdown(s.deadline, s.phase !== 'reveal', now);
  const [text, setText] = useState('');
  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const lastGuesses = useRef(0);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    if (s.guesses.length > lastGuesses.current) {
      const g = s.guesses[s.guesses.length - 1];
      if (g.kind === 'close' && g.pid === me.id) sfx.joker();
      else if (g.pid !== me.id && g.kind === 'wrong') sfx.chat();
    }
    lastGuesses.current = s.guesses.length;
  }, [s.guesses, me.id]);

  useEffect(() => {
    if (s.phase === 'reveal') s.winner === me.id || (s.winner && isDrawer) ? sfx.correct() : sfx.wrong();
  }, [s.phase]); // eslint-disable-line

  useEffect(() => { setText(''); }, [s.turnId]);

  const guess = () => {
    const t = text.trim();
    if (!t) return;
    send('guess', { text: t });
    setText('');
    inputRef.current?.focus();
  };

  let header;
  if (s.phase === 'choose') {
    header = isDrawer ? 'Such dir ein Wort aus' : `${drawer?.name || '…'} sucht ein Wort aus …`;
  } else if (s.phase === 'draw') {
    header = isDrawer ? (
      <span>Mal: <b style={{ color: 'var(--yellow)' }}>{s.word?.word}</b></span>
    ) : (
      <span className="mask">{maskWord(s.word?.word || '', revealFor(s, me.id, s.turnId) ? [...s.hints, 0, (s.word?.word || '').length - 1] : s.hints).map((c, i) => <span key={i} className={c === ' ' ? 'gap' : ''}>{c}</span>)}<small>{(s.word?.word || '').replace(/ /g, '').length}</small></span>
    );
  } else {
    header = <span>Das Wort war <b style={{ color: 'var(--yellow)' }}>{s.word?.word}</b></span>;
  }

  return (
    <div className="stack">
      <Players s={s} />
      <div className="draw-head">
        <span className="chip" style={{ background: 'var(--card2)' }}>Runde {s.round}/{s.settings.rounds}</span>
        <div className="draw-word">{header}</div>
        <span className="chip" style={{ background: left < 10 && s.phase === 'draw' ? 'var(--red)' : 'var(--card2)' }}>{s.phase === 'reveal' ? '✓' : Math.ceil(left) + ' s'}</span>
      </div>
      {s.phase === 'draw' && <TimerBar left={left} total={s.settings.seconds} />}

      <div style={{ position: 'relative' }}>
        <DrawCanvas room={room} turnId={s.turnId} editable={isDrawer && s.phase === 'draw'} />
        {s.phase === 'choose' && (
          <div className="draw-overlay">
            {isDrawer ? (
              <div className="stack center" style={{ width: '100%' }}>
                <b style={{ fontSize: 18 }}>Welches Wort willst du malen? ({Math.ceil(left)} s)</b>
                <div className="word-choices">
                  {s.options.map((o, i) => (
                    <button key={o.word} className={'btn ' + ['teal', 'blue', 'pink'][o.level - 1]} onClick={() => { sfx.pick(); send('choose', { index: i }); }}>
                      {o.word}<small className="lvl">{LEVEL[o.level]} · ×{MULT[o.level]}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="center stack">
                <Avatar avatar={drawer?.avatar} size={80} style={{ margin: '0 auto' }} />
                <b style={{ fontSize: 20 }}>{drawer?.name} wählt ein Wort …</b>
              </div>
            )}
          </div>
        )}
        {s.phase === 'reveal' && (
          <div className="draw-overlay soft">
            <div className="center stack">
              <div style={{ fontSize: 50 }}>{s.winner ? '🎉' : '⏰'}</div>
              <div className="display" style={{ fontSize: 30 }}>{s.word?.word}</div>
              <b style={{ fontSize: 18 }}>
                {s.winner ? `${s.players[s.winner]?.name} hat’s erraten! +${s.turnPoints[s.winner]}` : 'Keiner hat’s erraten'}
              </b>
              {s.winner && <div className="muted" style={{ fontWeight: 800 }}>{drawer?.name} bekommt +{s.turnPoints[s.drawer]} fürs Malen</div>}
              {isHost && <button className="btn small ghost" onClick={() => send('next')}>Weiter ➜</button>}
            </div>
          </div>
        )}
      </div>

      <div className="card guess-card">
        <div className="guess-feed" ref={feedRef}>
          {s.guesses.length === 0 && <div className="muted center" style={{ fontWeight: 700, padding: 8 }}>{isDrawer ? 'Hier siehst du die Tipps der anderen.' : 'Tipp los! Mehrere Versuche sind erlaubt.'}</div>}
          {s.guesses.map((g, i) => {
            const p = s.players[g.pid];
            return (
              <div key={i} className={'guess-line ' + g.kind}>
                <b>{p?.name}</b>{' '}
                {g.kind === 'correct' ? 'hat das Wort erraten! 🎉' : g.kind === 'close' ? 'ist ganz nah dran! 🔥' : g.text}
              </div>
            );
          })}
        </div>
        {!isDrawer && s.phase === 'draw' && (
          <div className="chat-input" style={{ padding: '8px 0 0' }}>
            <input ref={inputRef} value={text} maxLength={40} placeholder="Dein Tipp …" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guess()} autoComplete="off" autoCapitalize="off" />
            <button className="btn small teal" onClick={guess}>➜</button>
          </div>
        )}
        {!isDrawer && s.phase === 'draw' && <div style={{ marginTop: 8 }}><JokerBag room={room} me={me} items={['draw_letters']} /></div>}
        {(isDrawer || isHost) && s.phase === 'draw' && (
          <div className="center" style={{ marginTop: 8 }}>
            <button className="btn small ghost" onClick={() => confirm(isDrawer ? 'Zug aufgeben?' : 'Diesen Zug überspringen?') && send('skip')}>{isDrawer ? 'Aufgeben' : 'Zug überspringen'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Final({ room, me }) {
  const { state: s, send } = room;
  const isHost = s.hostId === me.id;
  const wins = winners(s);
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
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
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Picasso des Abends 🎨'}</h1>
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
      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 4 }}>Endstand</h3>
        <ScoreList players={players} />
      </div>
      {isHost ? (
        <div className="stack">
          <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nochmal 🎨</button>
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
