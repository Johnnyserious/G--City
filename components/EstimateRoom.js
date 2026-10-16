'use client';
import { useEffect, useRef, useState } from 'react';
import { DevBots } from './DevPanel';
import JokerBag, { ShopToggle } from './JokerBag';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { useCountdown, TimerBar, ScoreList } from './ImposterParts';
import { EstSettings, EstRules, EstQuestion, NumberEntry, BetPicker, EstReveal } from './EstimateParts';
import { sfx } from '@/lib/sound';
import { onlineIds } from '@/lib/engine';
import { MIN_PLAYERS, needsEstimate, winners } from '@/lib/estimate';

export default function EstimateRoom({ room, me, code }) {
  const { state: s } = room;
  const last = useRef(null);
  useEffect(() => {
    const k = s.phase + s.idx;
    if (last.current === k) return;
    last.current = k;
    if (s.phase === 'answer') sfx.pick();
    if (s.phase === 'reveal') sfx.fanfare();
  }, [s.phase, s.idx]);

  if (s.phase === 'lobby') return <EstLobby room={room} me={me} code={code} />;
  if (s.phase === 'final') return <Final room={room} me={me} />;
  if (!s.inGame.includes(me.id)) {
    return <div className="card center stack"><div style={{ fontSize: 54 }}>👀</div><h2>Gerade läuft eine Frage</h2><p className="muted">Bei der nächsten bist du dabei.</p></div>;
  }
  return <Question room={room} me={me} />;
}

function EstLobby({ room, me, code }) {
  const { state: s, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = s.hostId === me.id;
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const enough = onlineIds(s).length >= MIN_PLAYERS;
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'G City – Schätz-Duell', text: 'Komm zum Schätz-Duell in G City! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>📏 Schätz-Duell · Raum-Code</div>
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
        <EstSettings settings={s.settings} disabled={!isHost} onChange={(x) => send('settings', x)} />
        {!isHost && <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Nur der Host kann das ändern.</div>}
      </div>
      <DevBots room={room} me={me} />
      <ShopToggle room={room} me={me} />
      <EstRules />
      {isHost ? (
        <button className="btn big full pink" disabled={!enough} onClick={() => { sfx.fanfare(); send('start'); }}>
          {enough ? 'Spiel starten 📏' : `Mindestens ${MIN_PLAYERS} Spieler nötig`}
        </button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>Warte, bis {s.players[s.hostId]?.name || 'der Host'} startet …</div>
      )}
    </div>
  );
}

function Question({ room, me }) {
  const { state: s, send, now } = room;
  const q = s.qs[s.idx];
  const isHost = s.hostId === me.id;
  const duel = s.settings.mode === 'duel';
  const left = useCountdown(s.deadline, s.phase === 'answer', now);
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [s.idx]);
  const players = s.order.map((id) => s.players[id]).filter(Boolean);
  const mustEstimate = needsEstimate(s.settings.mode, s.duel, me.id);
  const myEntry = s.entries[me.id];
  const jokerAvailable = !s.jokerUsed[me.id] || !!myEntry?.joker;
  const [A, B] = s.duel.map((id) => s.players[id]);
  const done = (id) => (needsEstimate(s.settings.mode, s.duel, id) ? Number.isFinite(s.entries[id]?.v) : !!s.bets[id]);

  return (
    <div className="stack">
      <div className="scorebar" style={{ marginBottom: 0 }}>
        {players.filter((p) => p.online).map((p) => (
          <div key={p.id} className={'score-item' + (s.duel.includes(p.id) ? ' turn' : '')}>
            <Avatar avatar={p.avatar} size={30} />
            <span style={{ fontWeight: 800, fontSize: 13 }}>{s.duel.includes(p.id) ? '⚔️ ' : ''}{p.name}{s.jokerUsed[p.id] ? ' 🃏' : ''}</span>
            <span className="pts">{p.score}</span>
          </div>
        ))}
      </div>
      <EstQuestion q={q} idx={s.idx} total={s.qs.length} />

      {s.phase === 'answer' && (
        <>
          <TimerBar left={left} total={s.settings.seconds} />
          {duel && (
            <div className="card center duel-head">
              <span><Avatar avatar={A?.avatar} size={44} /><b>{A?.name}</b></span>
              <span className="display" style={{ fontSize: 26, color: 'var(--yellow)' }}>VS</span>
              <span><Avatar avatar={B?.avatar} size={44} /><b>{B?.name}</b></span>
            </div>
          )}
          {mustEstimate ? (
            <NumberEntry
              key={s.idx}
              unit={q.unit}
              jokerAvailable={jokerAvailable}
              submitted={editing ? null : myEntry && Number.isFinite(myEntry.v) ? myEntry : null}
              onEdit={() => setEditing(true)}
              onSubmit={(v, joker) => { send('estimate', { value: v, joker }); setEditing(false); }}
            />
          ) : (
            <BetPicker key={s.idx} a={A} b={B} current={s.bets[me.id]} jokerAvailable={jokerAvailable} onBet={(side, joker) => send('bet', { side, joker })} />
          )}
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {s.inGame.filter((id) => s.players[id]?.online).map((id) => (
              <div key={id} style={{ opacity: done(id) ? 1 : 0.35, position: 'relative' }}>
                <Avatar avatar={s.players[id]?.avatar} size={36} />
                {done(id) && <span style={{ position: 'absolute', right: -4, bottom: -4 }}>✅</span>}
              </div>
            ))}
          </div>
          <JokerBag room={room} me={me} items={['est_double']} />
          <div className="center muted" style={{ fontWeight: 800 }}>{Math.ceil(left)} s</div>
          {isHost && <div className="center"><button className="btn small ghost" onClick={() => send('endAnswer')}>Auflösen ➜</button></div>}
        </>
      )}

      {s.phase === 'reveal' && (
        <>
          <EstReveal q={q} mode={s.settings.mode} duel={s.duel} entries={s.entries} bets={s.bets} result={s.result} players={players} />
          <div className="card"><h3 style={{ fontSize: 22, marginBottom: 4 }}>Zwischenstand</h3><ScoreList players={players} /></div>
          {isHost ? (
            <button className="btn big full pink" onClick={() => { sfx.pick(); send('next'); }}>{s.idx + 1 >= s.qs.length ? 'Zum Endstand 🏆' : 'Nächste Frage ➜'}</button>
          ) : (
            <div className="center muted" style={{ fontWeight: 800 }}>Der Host geht gleich weiter.</div>
          )}
        </>
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
        <h1 style={{ fontSize: 38 }}>{wins.length > 1 ? 'Gleichstand! 🏆' : 'Schätz-König 📏👑'}</h1>
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
          <button className="btn big full pink" disabled={onlineIds(s).length < MIN_PLAYERS} onClick={() => { sfx.fanfare(); send('start'); }}>Nochmal 📏</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn small ghost" onClick={() => setShowSettings(!showSettings)}>⚙️ Einstellungen</button>
            <button className="btn small ghost" onClick={() => send('lobby')}>Lobby</button>
          </div>
          {showSettings && <div className="card"><EstSettings settings={s.settings} onChange={(x) => send('settings', x)} /></div>}
        </div>
      ) : (
        <div className="center muted" style={{ fontWeight: 800 }}>Der Host kann nochmal starten.</div>
      )}
    </div>
  );
}
