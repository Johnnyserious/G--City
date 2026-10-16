'use client';
import { useEffect, useRef, useState } from 'react';
import { DevBots } from './DevPanel';
import JokerBag, { ShopToggle } from './JokerBag';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import MemeImage from './MemeImage';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { sfx } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { MIN_PLAYERS, ROUND_OPTIONS, SECOND_OPTIONS, PRESENT_SECONDS, GUESS_POINTS, MAX_TEXT, raters, winners } from '@/lib/meme';

export default function MemeRoom({ room, me, code }) {
  const { state: s } = room;
  const last = useRef(null);
  useEffect(() => {
    if (last.current === s.phase) return;
    last.current = s.phase;
    if (s.phase === 'write') sfx.pick();
    if (s.phase === 'present') sfx.joker();
  }, [s.phase]);

  const playing = s.inGame?.includes(me.id);
  if (s.phase === 'lobby') return <MemeLobby room={room} me={me} code={code} />;
  if (!playing && (s.phase === 'write' || s.phase === 'present')) {
    return (
      <div className="card center stack">
        <div style={{ fontSize: 54 }}>👀</div>
        <h2>Gerade läuft Runde {s.round}</h2>
        <p className="muted">Ab der nächsten Runde bist du dabei.</p>
      </div>
    );
  }
  if (s.phase === 'write') return <WritePhase room={room} me={me} />;
  if (s.phase === 'present') return <PresentPhase room={room} me={me} />;
  return <RoundEnd room={room} me={me} />;
}

function Settings({ s, send, disabled }) {
  return (
    <div className="stack">
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Runden</div>
        <div className="seg">
          {ROUND_OPTIONS.map((r) => (
            <button key={r} className={'seg-btn' + (s.settings.rounds === r ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { rounds: r }); }}>{r} Runden</button>
          ))}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Zeit zum Schreiben</div>
        <div className="seg">
          {SECOND_OPTIONS.map((t) => (
            <button key={t} className={'seg-btn' + (s.settings.seconds === t ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { seconds: t }); }}>{t} s</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemeLobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const enough = onlineIds(s).length >= MIN_PLAYERS;
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Make it Meme', text: 'Komm zu Make it Meme in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>😂 Make it Meme · Raum-Code</div>
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
      <DevBots room={room} me={me} />
      <ShopToggle room={room} me={me} />
      <details className="card rules">
        <summary className="display" style={{ fontSize: 20 }}>So geht’s 📖</summary>
        <ol>
          <li>Jeder bekommt eine eigene Meme-Vorlage und schreibt Text oben und/oder unten drauf. Einmal pro Runde darfst du das Bild neu würfeln.</li>
          <li>Danach kommen alle Memes anonym nacheinander. Gib jedem 1–5 ⭐ und tipp, von wem es ist.</li>
          <li>Die Sterne gehen an den Ersteller. Richtig geraten: +{GUESS_POINTS} für dich.</li>
          <li>Nach der letzten Runde gewinnt, wer die meisten Punkte hat – bei Gleichstand mehrere.</li>
        </ol>
      </details>
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>
          {enough ? 'Spiel starten 😂' : `Mindestens ${MIN_PLAYERS} Spieler nötig`}
        </button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

// ---------------- Schreiben ----------------
function WritePhase({ room, me }) {
  const { state: s, send, now } = room;
  const as = s.assign[me.id];
  const sub = s.subs[me.id];
  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const left = useCountdown(s.deadline, true, now);
  const isHost = s.hostId === me.id;
  const done = s.inGame.filter((id) => s.subs[id]).length;

  useEffect(() => { setTop(''); setBottom(''); }, [s.round]);
  if (!as) return null;

  const submit = () => {
    if (!top.trim() && !bottom.trim()) return;
    sfx.correct();
    send('submit', { top, bottom });
  };

  return (
    <div className="stack">
      <div className="row between">
        <h2 style={{ fontSize: 26 }}>Runde {s.round}/{s.settings.rounds}</h2>
        <span className="chip" style={{ background: 'var(--card2)' }}>{Math.ceil(left)} s</span>
      </div>
      <TimerBar left={left} total={s.settings.seconds} />
      <div className="center">
        <MemeImage tpl={as.tpl} top={sub ? sub.top : top} bottom={sub ? sub.bottom : bottom} maxHeight="46vh" />
      </div>
      {sub ? (
        <div className="card center stack">
          <b style={{ fontSize: 20 }}>Abgegeben ✓</b>
          <div className="muted" style={{ fontWeight: 700 }}>Warte auf die anderen ({done}/{s.inGame.length}) …</div>
          <div><button className="btn small ghost" onClick={() => { setTop(sub.top); setBottom(sub.bottom); send('unsubmit'); }}>✏️ Nochmal ändern</button></div>
        </div>
      ) : (
        <div className="card stack">
          <input className="input" maxLength={MAX_TEXT} placeholder="Text oben" value={top} onChange={(e) => setTop(e.target.value)} autoComplete="off" />
          <input className="input" maxLength={MAX_TEXT} placeholder="Text unten" value={bottom} onChange={(e) => setBottom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="off" />
          <div className="row">
            <button className="btn ghost small" disabled={as.rerolled} onClick={() => { sfx.pick(); send('reroll'); }}>{as.rerolled ? '🎲 schon gewürfelt' : '🎲 Anderes Bild'}</button>
            <button className="btn green" style={{ flex: 1 }} disabled={!top.trim() && !bottom.trim()} onClick={submit}>Fertig ✓</button>
          </div>
          <JokerBag room={room} me={me} items={['meme_reroll']} />
        </div>
      )}
      <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {s.inGame.map((id) => (
          <div key={id} style={{ opacity: s.subs[id] ? 1 : 0.35, position: 'relative' }}>
            <Avatar avatar={s.players[id]?.avatar} size={36} />
            {s.subs[id] && <span style={{ position: 'absolute', right: -4, bottom: -4 }}>✅</span>}
          </div>
        ))}
      </div>
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('endWrite')}>Nicht warten, Memes zeigen ➜</button></div>}
    </div>
  );
}

// ---------------- Bewerten + Raten ----------------
function PresentPhase({ room, me }) {
  const { state: s, send, now } = room;
  const author = s.show[s.showIdx];
  const mine = author === me.id;
  const sub = s.subs[author] || {};
  const tpl = s.assign[author]?.tpl;
  const my = s.cur[me.id] || {};
  const left = useCountdown(s.deadline, true, now);
  const rs = raters(s);
  const isHost = s.hostId === me.id;
  const others = s.inGame.filter((id) => id !== me.id).map((id) => s.players[id]).filter(Boolean);
  const doneCount = rs.filter((id) => s.cur[id]?.stars && s.cur[id]?.guess).length;

  return (
    <div className="stack">
      <div className="row between">
        <h2 style={{ fontSize: 24 }}>Meme {s.showIdx + 1} von {s.show.length}</h2>
        <span className="chip" style={{ background: 'var(--card2)' }}>Runde {s.round}</span>
      </div>
      <TimerBar left={left} total={PRESENT_SECONDS} />
      <div className="center">
        <MemeImage key={author} tpl={tpl} top={sub.top} bottom={sub.bottom} maxHeight="44vh" />
      </div>
      {mine ? (
        <div className="card center" style={{ fontWeight: 800 }}>Das ist dein Meme 🤫 Pokerface!</div>
      ) : (
        <div className="card stack">
          <div>
            <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Wie lustig?</div>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={'star' + ((my.stars || 0) >= n ? ' on' : '')} onClick={() => { sfx.vote(); send('rate', { stars: n }); }} aria-label={n + ' Sterne'}>★</button>
              ))}
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Von wem ist das?</div>
            <div className="guess-row">
              {others.map((p) => (
                <button key={p.id} className={'guess-btn' + (my.guess === p.id ? ' on' : '')} onClick={() => { sfx.click(); send('rate', { guess: p.id }); }}>
                  <Avatar avatar={p.avatar} size={46} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="center muted" style={{ fontWeight: 800 }}>{doneCount}/{rs.length} fertig · {Math.ceil(left)} s</div>
      {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('skipMeme')}>Weiter ➜</button></div>}
    </div>
  );
}

// ---------------- Rundenende / Endstand ----------------
function RoundEnd({ room, me }) {
  const { state: s, send } = room;
  const isHost = s.hostId === me.id;
  const final = s.phase === 'final';
  const best = Math.max(0, ...s.results.map((r) => r.stars));
  const sorted = [...s.results].sort((a, b) => b.stars - a.stars);
  const wins = final ? winners(s) : [];
  const allPlayers = s.order.map((id) => s.players[id]).filter(Boolean);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    sfx.fanfare();
    if (final) {
      const end = Date.now() + 1500;
      const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, zIndex: 100 });
        confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, zIndex: 100 });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [final, s.round]);

  return (
    <div className="stack">
      {final ? (
        <div className="card center stack">
          <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Meme-König 👑'}</h1>
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
      ) : (
        <h2 className="center" style={{ fontSize: 30 }}>Runde {s.round} – Auflösung</h2>
      )}

      <h3 style={{ fontSize: 22 }}>{final ? `Memes aus Runde ${s.round}` : 'Die Memes'}</h3>
      <div className="meme-results">
        {sorted.map((r) => {
          const p = s.players[r.pid];
          const others = s.inGame.filter((id) => id !== r.pid).length;
          return (
            <div key={r.pid} className={'card meme-result' + (r.stars === best && best > 0 ? ' best' : '')}>
              <MemeImage tpl={r.tpl} top={r.top} bottom={r.bottom} maxHeight="38vh" />
              <div className="row between" style={{ marginTop: 10 }}>
                <span className="row" style={{ gap: 6 }}><Avatar avatar={p?.avatar} size={30} /><b>{p?.name}</b>{r.stars === best && best > 0 && ' 🏆'}</span>
                <span className="display" style={{ color: 'var(--yellow)', fontSize: 20 }}>{r.stars} ⭐</span>
              </div>
              <div className="muted" style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                Erraten von {r.guessedBy.length}/{others}{r.guessedBy.length ? ': ' + r.guessedBy.map((id) => s.players[id]?.name).join(', ') : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 4 }}>{final ? 'Endstand' : 'Zwischenstand'}</h3>
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
          ⭐ = Punkte für den Ersteller · richtig geraten +{GUESS_POINTS}
          {s.roundPoints[me.id] ? ` · Du diese Runde: +${s.roundPoints[me.id]}` : ''}
        </div>
        <ScoreList players={allPlayers} />
      </div>

      {isHost ? (
        <div className="stack">
          {final ? (
            <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Neues Spiel 😂</button>
          ) : (
            <button className="btn big full pink" onClick={() => { sfx.pick(); send('nextRound'); }}>Runde {s.round + 1} ➜</button>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            {final && <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen</button>}
            <button className="btn small ghost" onClick={() => confirm('Zurück in die Lobby? Punkte werden zurückgesetzt.') && send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><Settings s={s} send={send} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>{final ? 'Der Host kann ein neues Spiel starten.' : 'Der Host startet die nächste Runde.'}</div>
      )}
    </div>
  );
}
