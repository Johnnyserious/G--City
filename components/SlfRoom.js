'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { DevBots } from './DevPanel';
import { ShopToggle } from './JokerBag';
import Avatar from './Avatar';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { sfx, haptic } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { pickB, WIN } from '@/lib/berlin';
import {
  MIN_PLAYERS, ROUND_OPTIONS, SECOND_OPTIONS, ALPHABET, PTS, SPIN_MS, STOP_GRACE, VOTE_SECONDS,
  catsOf, firstLetter, itemValid, winners,
} from '@/lib/slf';

const CUSTOM_IDEAS = ['Rapper', 'Promi', 'Marke', 'Essen', 'Tier', 'Ausrede', 'Schimpfwort (jugendfrei)', 'Beruf', 'Fußballer', 'Film/Serie'];

export default function SlfRoom({ room, me, code }) {
  const { state: s } = room;
  if (s.phase === 'lobby') return <Lobby room={room} me={me} code={code} />;
  if (s.phase === 'final') return <Final room={room} me={me} />;
  return (
    <div className="stack">
      <Head s={s} />
      {s.phase === 'spin' && <Spin room={room} me={me} />}
      {s.phase === 'write' && <Write room={room} me={me} />}
      {s.phase === 'vote' && <Vote room={room} me={me} />}
      {s.phase === 'results' && <Results room={room} me={me} />}
    </div>
  );
}

function Head({ s }) {
  const players = s.order.map((id) => s.players[id]).filter((p) => p && p.online);
  return (
    <>
      <div className="scorebar" style={{ marginBottom: 0 }}>
        {players.map((p) => (
          <div key={p.id} className={'score-item' + (s.stopBy === p.id ? ' solved' : '')}>
            <Avatar avatar={p.avatar} size={30} />
            <span style={{ fontWeight: 800, fontSize: 13 }}>{s.stopBy === p.id ? '✋ ' : ''}{p.name}</span>
            <span className="pts">{p.score}</span>
          </div>
        ))}
      </div>
      <div className="row between">
        <span className="muted" style={{ fontWeight: 800 }}>Runde {s.round + 1}/{s.rounds}</span>
        {s.letter && s.phase !== 'spin' && <span className="slf-letter-chip">{s.letter}</span>}
      </div>
    </>
  );
}

// ---------- Einstellungen ----------
function Settings({ s, send, disabled }) {
  const [custom, setCustom] = useState(s.custom || '');
  const t = useRef(null);
  useEffect(() => { if (disabled) setCustom(s.custom || ''); }, [s.custom, disabled]);
  const setC = (v) => {
    setCustom(v);
    clearTimeout(t.current);
    t.current = setTimeout(() => send('settings', { custom: v }), 350);
  };
  const toggleLetter = (l) => {
    sfx.click();
    const off = s.settings.off.includes(l) ? s.settings.off.filter((x) => x !== l) : [...s.settings.off, l];
    send('settings', { off });
  };
  return (
    <div className="stack">
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Runden</div>
        <div className="seg">
          {ROUND_OPTIONS.map((n) => <button key={n} className={'seg-btn' + (s.settings.rounds === n ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { rounds: n }); }}>{n} Runden</button>)}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Zeit zum Schreiben</div>
        <div className="seg">
          {SECOND_OPTIONS.map((n) => <button key={n} className={'seg-btn' + (s.settings.seconds === n ? ' on' : '')} disabled={disabled} onClick={() => { sfx.click(); send('settings', { seconds: n }); }}>{n === 60 ? '1 Minute' : n + ' s'}</button>)}
        </div>
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>⭐ Eigene Extra-Kategorie (nur für dieses Spiel)</div>
        <input className="input" maxLength={22} disabled={disabled} placeholder="z. B. Rapper, Promi, Ausrede …" value={disabled ? s.custom : custom} onChange={(e) => setC(e.target.value)} />
        {!disabled && !custom && (
          <div className="seg seg-wrap" style={{ marginTop: 6 }}>
            {CUSTOM_IDEAS.map((c) => <button key={c} className="seg-btn small-seg" onClick={() => { sfx.click(); setC(c); }}>{c}</button>)}
          </div>
        )}
      </div>
      <div>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>Buchstaben auf dem Rad (antippen = raus/rein)</div>
        <div className="letter-grid">
          {ALPHABET.map((l) => <button key={l} className={'letter-btn' + (s.settings.off.includes(l) ? ' off' : '')} disabled={disabled} onClick={() => toggleLetter(l)}>{l}</button>)}
        </div>
      </div>
    </div>
  );
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
      try { await navigator.share({ title: 'G City – Stadt, Land, Fluss', text: 'Komm rin! Stadt, Land, Fluss in G City. Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>🏙️ Stadt, Land, Fluss, Insider · Raum-Code</div>
        <div className="code-big">{code}</div>
        <button className="btn teal" onClick={invite}>{copied ? 'Link kopiert ✓' : '📨 Leute rinholen'}</button>
      </div>
      <div className="card">
        <h3 style={{ fontSize: 24, marginBottom: 12 }}>Wer is dabei? ({players.length})</h3>
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
        {!isHost && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Nur der Host kann dit ändern.</div>}
      </div>
      <DevBots room={room} me={me} />
      <ShopToggle room={room} me={me} />
      <Rules />
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>{enough ? "Los jeht's 🏙️" : `Mindestens ${MIN_PLAYERS} Leute, wa?`}</button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte ma, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

function Rules() {
  return (
    <details className="card rules">
      <summary className="display" style={{ fontSize: 20 }}>So jeht’s 📖</summary>
      <ol>
        <li>Reihum dreht einer am Glücksrad – dit gibt den Buchstaben vor.</li>
        <li>Alle tippen gleichzeitig: Stadt, Land, Fluss und einen <b>Insider</b> aus eurer Gruppe. Reihenfolge egal, leer lassen geht ooch.</li>
        <li>Wer alles hat, drückt <b>STOPP ✋</b> – dann haben alle anderen noch {STOP_GRACE} Sekunden.</li>
        <li>Städte, Länder und Flüsse prüft die App selbst. Insider und Unbekanntes: alle stimmen mit 👍/👎 ab.</li>
        <li>Punkte: <b>{PTS.unique}</b> wenn nur du dit Wort hast, <b>{PTS.shared}</b> wenn’s mehrere haben, <b>0</b> wenn’s nicht gilt.</li>
      </ol>
    </details>
  );
}

// ---------- Glücksrad ----------
const COLORS = ['#ff5d8f', '#ffd23f', '#2ee6c5', '#4d7cff', '#ff8a3d', '#b388ff', '#4be37a'];
function Wheel({ letters, target, spinStart, now }) {
  const n = letters.length;
  const seg = 360 / n;
  const [rot, setRot] = useState(0);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    if (!spinStart || !target) { setRot(0); setAnim(false); return; }
    const idx = letters.indexOf(target);
    const final = 360 * 6 + (360 - (idx + 0.5) * seg);
    const elapsed = now() - spinStart;
    if (elapsed > SPIN_MS) { setAnim(false); setRot(final); return; }
    setAnim(false);
    setRot(0);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => { setAnim(true); setRot(final); }));
    return () => cancelAnimationFrame(r);
  }, [spinStart, target]); // eslint-disable-line
  const R = 140;
  const path = (i) => {
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const large = seg > 180 ? 1 : 0;
    return `M0,0 L${R * Math.cos(a0)},${R * Math.sin(a0)} A${R},${R} 0 ${large} 1 ${R * Math.cos(a1)},${R * Math.sin(a1)} Z`;
  };
  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer">▼</div>
      <svg viewBox="-150 -150 300 300" className="wheel" style={{ transform: `rotate(${rot}deg)`, transition: anim ? `transform ${SPIN_MS}ms cubic-bezier(.12,.7,.12,1)` : 'none' }}>
        {letters.map((l, i) => {
          const mid = ((i + 0.5) * seg - 90) * (Math.PI / 180);
          return (
            <g key={l}>
              <path d={path(i)} fill={COLORS[i % COLORS.length]} stroke="#0b0624" strokeWidth="3" />
              <text x={R * 0.78 * Math.cos(mid)} y={R * 0.78 * Math.sin(mid)} textAnchor="middle" dominantBaseline="central" fontSize={n > 18 ? 17 : 22} fontFamily="Lilita One, sans-serif" fill="#1b1240" transform={`rotate(${(i + 0.5) * seg}, ${R * 0.78 * Math.cos(mid)}, ${R * 0.78 * Math.sin(mid)})`}>{l}</text>
            </g>
          );
        })}
        <circle r="26" fill="#2b1f6b" stroke="#0b0624" strokeWidth="4" />
        <text textAnchor="middle" dominantBaseline="central" fontSize="22">🎡</text>
      </svg>
    </div>
  );
}

function Spin({ room, me }) {
  const { state: s, send, now } = room;
  const spinner = s.players[s.spinner];
  const mine = s.spinner === me.id;
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    setLanded(false);
    if (!s.spinStart) return;
    const left = SPIN_MS - (now() - s.spinStart);
    // Klick-Geräusche, die langsamer werden
    const timers = [];
    if (left > 0) {
      let t = 0;
      let gap = 60;
      while (t < left - 150) { timers.push(setTimeout(() => sfx.tick(), t)); t += gap; gap *= 1.09; }
    }
    timers.push(setTimeout(() => { setLanded(true); sfx.fanfare(); haptic('big'); }, Math.max(0, left)));
    return () => timers.forEach(clearTimeout);
  }, [s.spinStart]); // eslint-disable-line
  return (
    <div className="card center stack">
      <Wheel letters={s.wheel} target={s.letter} spinStart={s.spinStart} now={now} />
      {landed && s.letter ? (
        <div className="slf-big-letter pop-in">{s.letter}</div>
      ) : s.spinStart ? (
        <div className="display" style={{ fontSize: 24 }}>Dreht sich … 🎡</div>
      ) : mine ? (
        <button className="btn big full pink" onClick={() => { haptic('success'); send('spin'); }}>Dreh dit Ding! 🎡</button>
      ) : (
        <div className="display" style={{ fontSize: 22 }}>{spinner?.name || 'Jemand'} dreht jleich …</div>
      )}
      {!s.spinStart && s.hostId === me.id && !mine && <button className="btn small ghost" onClick={() => send('spin')}>Für {spinner?.name || 'ihn'} drehen</button>}
    </div>
  );
}

// ---------- Schreiben ----------
function Write({ room, me }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  const cats = catsOf(s);
  const inGame = !!s.answers[me.id];
  const [ans, setAns] = useState(() => ({ ...(s.answers[me.id] || {}) }));
  const ansRef = useRef(ans);
  ansRef.current = ans;
  const timers = useRef({});
  const flushed = useRef('');
  const over = left <= 0;
  const filled = cats.filter((c) => String(ans[c.key] || '').trim()).length;
  const allFilled = filled === cats.length;

  const change = (k, v) => {
    setAns((a) => ({ ...a, [k]: v }));
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => send('type', { cat: k, text: v }), 350);
  };
  const flush = (stop = false) => send('all', { answers: ansRef.current, stop });
  // STOPP von jemand anderem oder Zeit fast um → alles sofort abschicken
  useEffect(() => {
    if (s.stopBy && s.stopBy !== me.id && flushed.current !== 'stop') { flushed.current = 'stop'; flush(); sfx.wrong(); haptic('error'); }
  }, [s.stopBy]); // eslint-disable-line
  useEffect(() => {
    if (left > 0 && left < 1.6 && flushed.current !== 'end') { flushed.current = 'end'; flush(); }
  }, [left < 1.6]); // eslint-disable-line

  if (!inGame) return <div className="card center" style={{ fontWeight: 800 }}>Du bist ab der nächsten Runde dabei 🏙️</div>;
  const stopper = s.stopBy ? s.players[s.stopBy] : null;
  return (
    <div className="stack">
      <div className="row between">
        <div className="slf-big-letter small">{s.letter}</div>
        <span className="chip" style={{ background: left < 6 ? 'var(--red)' : 'var(--card2)', fontSize: 18 }}>{Math.ceil(left)} s</span>
      </div>
      <TimerBar left={left} total={s.settings.seconds} />
      {stopper && <div className="stop-banner">✋ {stopper.id === me.id ? 'Du hast' : stopper.name + ' hat'} STOPP jerufen – noch {Math.ceil(left)} Sekunden!</div>}
      <div className="card stack">
        {cats.map((c) => {
          const v = ans[c.key] || '';
          const bad = v.trim() && firstLetter(v) !== s.letter;
          return (
            <label key={c.key} className={'slf-field' + (bad ? ' bad' : v.trim() ? ' ok' : '')}>
              <span className="slf-cat">{c.icon} {c.name}</span>
              <input
                value={v}
                disabled={over}
                maxLength={40}
                placeholder={`${s.letter} …`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => change(c.key, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { const els = [...document.querySelectorAll('.slf-field input')]; const i = els.indexOf(e.target); els[i + 1]?.focus(); } }}
              />
              {bad && <span className="slf-warn">Muss mit {s.letter} anfangen!</span>}
            </label>
          );
        })}
      </div>
      <button className={'btn big full ' + (allFilled ? 'pink stop-btn' : 'ghost')} disabled={!allFilled || !!s.stopBy || over} onClick={() => { haptic('big'); sfx.joker(); flushed.current = 'stop'; flush(true); }}>
        {s.stopBy ? 'STOPP is jerufen ✋' : allFilled ? 'STOPP! ✋' : `Noch ${cats.length - filled} offen – oder leer lassen`}
      </button>
    </div>
  );
}

// ---------- Abstimmung ----------
function Vote({ room, me }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  const cats = catsOf(s);
  const done = !!s.voteDone[me.id];
  const voteItems = s.items.filter((i) => i.vote);
  const auto = s.items.filter((i) => i.auto);
  const doneCount = s.inGame.filter((id) => s.voteDone[id]).length;
  return (
    <div className="stack">
      <div className="row between">
        <h2 style={{ fontSize: 26, margin: 0 }}>Gilt dit? 🤔</h2>
        <span className="chip" style={{ background: 'var(--card2)' }}>{Math.ceil(left)} s</span>
      </div>
      <TimerBar left={left} total={VOTE_SECONDS} />
      <div className="muted" style={{ fontWeight: 700 }}>Alles is erstmal 👍. Tipp auf 👎, wenn’s dit nich jibt oder der Insider Quatsch is.</div>
      {cats.map((c) => {
        const list = voteItems.filter((i) => i.cat === c.key);
        if (!list.length) return null;
        return (
          <div key={c.key} className="card stack">
            <b>{c.icon} {c.name}</b>
            {list.map((it) => {
              const mineIt = it.pids.includes(me.id);
              const no = s.votes[it.key]?.[me.id] === -1;
              const noCount = Object.values(s.votes[it.key] || {}).filter((x) => x === -1).length;
              const valid = itemValid(s, it);
              return (
                <div key={it.key} className={'vote-row' + (valid ? '' : ' rejected')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="vote-word">{it.text}</div>
                    <div className="vote-by">{it.pids.map((id) => s.players[id]?.name).join(', ')}{noCount ? ` · 👎 ${noCount}` : ''}</div>
                  </div>
                  {mineIt ? (
                    <span className="muted" style={{ fontWeight: 800, fontSize: 13 }}>deins</span>
                  ) : (
                    <div className="row" style={{ gap: 6 }}>
                      <button className={'vote-btn' + (!no ? ' on yes' : '')} disabled={done} onClick={() => { haptic('tap'); send('vote', { key: it.key, no: false }); }}>👍</button>
                      <button className={'vote-btn' + (no ? ' on no' : '')} disabled={done} onClick={() => { haptic('tap'); sfx.click(); send('vote', { key: it.key, no: true }); }}>👎</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {auto.length > 0 && <div className="muted" style={{ fontWeight: 700, fontSize: 13 }}>✅ Automatisch jeprüft: {auto.map((i) => i.text).join(', ')}</div>}
      <button className="btn big full green" disabled={done} onClick={() => { haptic('success'); sfx.pick(); send('voteDone'); }}>{done ? `Warte auf die anderen (${doneCount}/${s.inGame.length}) …` : 'Passt so ✓'}</button>
      {s.hostId === me.id && <div className="center"><button className="btn small ghost" onClick={() => send('endVote')}>Abstimmung beenden ➜</button></div>}
    </div>
  );
}

// ---------- Auswertung ----------
function Results({ room, me }) {
  const { state: s, send, now } = room;
  const left = useCountdown(s.deadline, true, now);
  const cats = catsOf(s);
  const r = s.result;
  const ids = s.inGame.filter((id) => s.players[id]);
  const myPts = r?.total[me.id] || 0;
  const best = Math.max(0, ...ids.map((id) => r?.total[id] || 0));
  const say = useMemo(() => pickB(WIN), [s.round]);
  useEffect(() => {
    sfx.fanfare();
    if (myPts && myPts === best) confetti({ particleCount: 70, spread: 70, origin: { y: 0.4 }, zIndex: 100 });
  }, []); // eslint-disable-line
  if (!r) return null;
  return (
    <div className="stack">
      <div className="card center stack pop-in">
        <div className="muted" style={{ fontWeight: 800 }}>Deine Runde mit {s.letter}</div>
        <div className="display" style={{ fontSize: 44, color: 'var(--yellow)' }}>+{myPts}</div>
        {myPts > 0 && myPts === best && <div className="display" style={{ fontSize: 20, color: 'var(--green)' }}>{say}</div>}
      </div>
      {cats.map((c) => (
        <div key={c.key} className="card">
          <b>{c.icon} {c.name}</b>
          <div className="slf-res">
            {ids.map((id) => {
              const a = r.per[id]?.[c.key];
              return (
                <div key={id} className="slf-res-row">
                  <Avatar avatar={s.players[id].avatar} size={26} />
                  <span className="slf-res-name">{s.players[id].name}</span>
                  <span className={'slf-res-word' + (!a ? ' empty' : a.pts === 0 ? ' bad' : '')}>{a ? a.text : '—'}</span>
                  <span className={'slf-pts p' + (a?.pts || 0)} title={a?.why}>{a ? (a.pts ? '+' + a.pts : '✗') : '0'}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3><ScoreList players={s.order.map((id) => s.players[id]).filter(Boolean)} /></div>
      {s.hostId === me.id ? (
        <button className="btn big full pink" onClick={() => { sfx.pick(); send('next'); }}>{s.round + 1 >= s.rounds ? 'Zur Endabrechnung 🏆' : `Nächste Runde ➜ (${Math.ceil(left)})`}</button>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Jeht gleich weiter … ({Math.ceil(left)} s)</div>
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
        <h1 style={{ fontSize: 36 }}>{wins.length > 1 ? 'Unentschieden, wa? 🏆' : 'Stadt-Land-Fluss-König 👑'}</h1>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
          {wins.map((p) => (
            <div key={p.id} className="player-chip" style={{ width: 96 }}>
              <Avatar avatar={p.avatar} size={84} />
              <div className="name" style={{ maxWidth: 96 }}>{p.name}</div>
              <span className="host-badge">{p.score} Punkte</span>
            </div>
          ))}
        </div>
        {wins.some((p) => p.id === me.id) && <div className="display" style={{ color: 'var(--green)', fontSize: 22 }}>Knorke, haste jewonnen! 🎉</div>}
      </div>
      <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Endstand nach {s.rounds} Runden</h3><ScoreList players={players} /></div>
      {isHost ? (
        <div className="stack">
          <button className="btn big full pink" onClick={() => { sfx.fanfare(); send('more'); }}>Noch 'ne Runde! 🔁</button>
          <div className="muted center" style={{ fontWeight: 700, fontSize: 13, marginTop: -6 }}>Punkte laufen weiter</div>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn small ghost" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nomma von vorn</button>
            <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen</button>
            <button className="btn small ghost" onClick={() => send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><Settings s={s} send={send} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host entscheidet: noch 'ne Runde oder Schluss.</div>
      )}
    </div>
  );
}
