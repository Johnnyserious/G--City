'use client';
import { useState } from 'react';
import Avatar from './Avatar';
import { sfx } from '@/lib/sound';
import { modeTally } from '@/lib/engine';

export default function Lobby({ room, me, code }) {
  const { state, send } = room;
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === me.id;
  const players = state.order.map((id) => state.players[id]).filter(Boolean);
  const tally = modeTally(state);
  const myVote = state.modeVotes[me.id];
  const link = typeof window !== 'undefined' ? window.location.origin + '/?r=' + code : '';
  const host = state.players[state.hostId];

  const invite = async () => {
    sfx.pop();
    if (navigator.share) {
      try { await navigator.share({ title: 'Quizabend', text: 'Komm ins Quiz! Code: ' + code, url: link }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const voters = (mode) => players.filter((p) => state.modeVotes[p.id] === mode);

  return (
    <div className="stack">
      <div className="card center">
        <div className="muted" style={{ fontWeight: 800 }}>Raum-Code</div>
        <div className="code-big">{code}</div>
        <button className="btn teal" onClick={invite}>{copied ? 'Link kopiert ✓' : '📨 Leute einladen'}</button>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 24 }}>Spieler ({players.length})</h3>
          <span className="muted" style={{ fontWeight: 700 }}>🧠 Quiz-Board</span>
        </div>
        <div className="players">
          {players.map((p) => (
            <div key={p.id} className="player-chip">
              <Avatar avatar={p.avatar} size={64} />
              <div className="name">{p.name}</div>
              {p.id === state.hostId && <span className="host-badge">HOST</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 24, marginBottom: 4 }}>Wie lang wird's? Stimm ab!</h3>
        <p className="muted" style={{ marginTop: 0 }}>Je höher der Wert, desto schwerer die Frage. Falsch = halbe Punkte weg.</p>
        <div className="mode-grid">
          {[100, 500].map((m) => (
            <button key={m} className={'mode-card' + (myVote === m ? ' on' : '')} onClick={() => { sfx.vote(); send('voteMode', { mode: m }); }}>
              <div className="big">bis {m}</div>
              <div style={{ fontWeight: 800 }}>{m === 100 ? 'Felder 20 – 100' : 'Felder 100 – 500'}</div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{m === 100 ? 'Kleine Zahlen, chillig' : 'Große Zahlen, mehr Drama'}</div>
              <div className="voters">
                {voters(m).map((p) => <Avatar key={p.id} avatar={p.avatar} size={28} />)}
                {tally[m] > 0 && <span style={{ marginLeft: 14, fontWeight: 900 }}>{tally[m]}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {isHost ? (
        <button className="btn big full pink" onClick={() => { sfx.fanfare(); send('start'); }}>Spiel starten 🚀</button>
      ) : (
        <div className="card center" style={{ fontWeight: 800 }}>
          Warte, bis <Avatar avatar={host?.avatar} size={28} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> {host?.name || 'der Host'} startet …
        </div>
      )}
    </div>
  );
}
