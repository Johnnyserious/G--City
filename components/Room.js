'use client';
import { useEffect, useRef, useState } from 'react';
import { useRoom } from '@/lib/room';
import { sfx, isMuted, setMuted } from '@/lib/sound';
import { supabaseDiag } from '@/lib/supabase';
import Lobby from './Lobby';
import Board from './Board';
import QuestionOverlay from './QuestionOverlay';
import EndScreen from './EndScreen';
import Chat from './Chat';
import Scorebar from './Scorebar';
import ImposterRoom from './ImposterRoom';
import MemeRoom from './MemeRoom';
import DrawRoom from './DrawRoom';
import BluffRoom from './BluffRoom';
import EmojiRoom from './EmojiRoom';

export default function Room({ code, me, isCreator, game, onLeave, onEditProfile }) {
  const room = useRoom({ code, me, isCreator, game });
  const { state, conn } = room;
  const [muted, setM] = useState(isMuted());
  const [toast, setToast] = useState('');
  const prevPlayers = useRef(null);

  // Sound + Hinweis, wenn jemand reinkommt
  useEffect(() => {
    if (!state) return;
    const ids = Object.keys(state.players).filter((id) => state.players[id].online);
    if (prevPlayers.current) {
      const fresh = ids.filter((id) => !prevPlayers.current.includes(id) && id !== me.id);
      if (fresh.length) {
        sfx.join();
        setToast(state.players[fresh[0]].name + ' ist da 👋');
        setTimeout(() => setToast(''), 1800);
      }
    }
    prevPlayers.current = ids;
  }, [state, me.id]);

  const leave = () => {
    if (confirm('Raum wirklich verlassen?')) onLeave();
  };

  let body;
  if (conn === 'error') {
    body = (
      <div className="card center stack" style={{ marginTop: 40 }}>
        <div style={{ fontSize: 60 }}>📡</div>
        <h2>Keine Verbindung</h2>
        <p className="muted">Die Live-Verbindung zu Supabase klappt nicht. Schick Claude einen Screenshot von diesem Kasten.</p>
        <div className="answer-box" style={{ textAlign: 'left', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          <div>Server: {supabaseDiag().host}</div>
          <div>Schlüssel-Typ: {supabaseDiag().kind}</div>
          <div>Fehler: {room.connError || 'keine Antwort (Zeitüberschreitung)'}</div>
        </div>
        <button className="btn" onClick={() => window.location.reload()}>Neu laden</button>
      </div>
    );
  } else if (!state && conn === 'missing') {
    body = (
      <div className="card center stack" style={{ marginTop: 40 }}>
        <div style={{ fontSize: 60 }}>🤷</div>
        <h2>Raum {code} nicht gefunden</h2>
        <p className="muted">Entweder ist der Code falsch oder niemand ist mehr im Raum.</p>
        <button className="btn" onClick={onLeave}>Zur Spielezentrale</button>
      </div>
    );
  } else if (!state) {
    body = (
      <div className="thinking">
        <div className="dice">🎲</div>
        <h2>Verbinde mit Raum {code} …</h2>
      </div>
    );
  } else if (state.game === 'emoji') {
    body = <EmojiRoom room={room} me={me} code={code} />;
  } else if (state.game === 'bluff') {
    body = <BluffRoom room={room} me={me} code={code} />;
  } else if (state.game === 'draw') {
    body = <DrawRoom room={room} me={me} code={code} />;
  } else if (state.game === 'meme') {
    body = <MemeRoom room={room} me={me} code={code} />;
  } else if (state.game === 'imposter') {
    body = <ImposterRoom room={room} me={me} code={code} />;
  } else if (state.phase === 'lobby') {
    body = <Lobby room={room} me={me} code={code} />;
  } else if (state.phase === 'end') {
    body = <EndScreen room={room} me={me} />;
  } else {
    body = (
      <>
        <Scorebar state={state} me={me} />
        <Board room={room} me={me} />
        {state.phase === 'question' && state.current && <QuestionOverlay room={room} me={me} />}
      </>
    );
  }

  const isHost = state?.hostId === me.id;

  return (
    <div className="wrap">
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Verlassen">←</button>
        <div className="row" style={{ gap: 8 }}>
          <div className="code-pill">{code}</div>
          {isHost && state.phase !== 'lobby' && (
            <button className="icon-btn" title="Spiel beenden" onClick={() => confirm('Spiel beenden und zurück in die Lobby?') && room.send('lobby')}>🏁</button>
          )}
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
          <button className="icon-btn" onClick={onEditProfile} aria-label="Profil">✏️</button>
        </div>
      </div>
      {body}
      {state && <Chat room={room} me={me} />}
    </div>
  );
}
