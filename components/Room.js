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
import SongRoom from './SongRoom';
import SlfRoom from './SlfRoom';
import EmojiRoom from './EmojiRoom';
import EstimateRoom from './EstimateRoom';
import { useResultReporter } from '@/lib/results';
import BerlinPop from './BerlinPop';
import { WIN, LOSE, pickB } from '@/lib/berlin';
import { levelInfo, reportResult } from '@/lib/player';
import { ask, choose } from '@/lib/dialog';
import { haptic } from '@/lib/sound';

export default function Room({ code, me, isCreator, game, onLeave, onEditProfile, onProfileUpdate }) {
  const room = useRoom({ code, me, isCreator, game });
  const { state, conn } = room;
  const [muted, setM] = useState(isMuted());
  const [toast, setToast] = useState('');
  const prevPlayers = useRef(null);
  const [reward, setReward] = useState(null);
  const [gain, setGain] = useState(null);
  const myScore = useRef(null);

  // Eigene Punkte im Spiel gestiegen → „+N“ fliegt hoch
  useEffect(() => {
    const sc = room.state?.players?.[me.id]?.score;
    if (sc == null) return;
    if (myScore.current != null && sc > myScore.current && room.state.phase !== 'lobby') {
      const n = sc - myScore.current;
      haptic('light');
      setGain({ n, id: Date.now() });
      setTimeout(() => setGain((g) => (g && Date.now() - g.id > 1500 ? null : g)), 1700);
    }
    myScore.current = sc;
  }, [room.state, me.id]);

  // Spiel vorbei → Ergebnis ins Profil, dazu „+40 G-Punkte“ einblenden
  useResultReporter(room.state, me, code, (p, pts, r) => {
    const before = levelInfo(me.points || 0).level;
    const after = levelInfo(p.points || 0).level;
    onProfileUpdate && onProfileUpdate(p);
    setTimeout(() => {
      sfx.coin();
      haptic(after > before ? 'big' : 'success');
      if (after > before) setTimeout(() => sfx.levelUp(), 350);
      setReward({ pts, level: after > before ? after : null, id: Date.now(), say: pickB(r?.rank === 1 ? WIN : LOSE) });
      setTimeout(() => setReward(null), 3200);
    }, 1400);
  });

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

  // Verlassen: in der Lobby sofort. Im laufenden Spiel kurz fragen – die anderen spielen weiter,
  // fürs Mitspielen gibt es trotzdem G-Punkte. Der Host kann stattdessen alle in die Lobby holen.
  const leave = async () => {
    const s = room.state;
    if (!s || s.phase === 'lobby') { onLeave(); return; }
    const host = s.hostId === me.id;
    const others = Object.values(s.players).filter((p) => p.id !== me.id && p.online && !p.bot).length;
    const v = await choose({
      title: 'Spiel verlassen?',
      text: others ? 'Die anderen können ohne dich weiterspielen.' : 'Außer dir ist kein echter Spieler mehr da.',
      options: [
        { label: 'Verlassen 👋', sub: 'Deine G-Punkte fürs Mitspielen bekommst du trotzdem', value: 'leave', cls: 'pink' },
        ...(host ? [{ label: 'Alle zurück in die Lobby', sub: 'Punkte bleiben stehen', value: 'lobby', cls: 'ghost' }] : []),
        { label: 'Weiterspielen', value: null, cls: 'ghost' },
      ],
    });
    if (v === 'lobby') { room.send('lobby'); return; }
    if (v !== 'leave') return;
    const n = Object.values(s.players).filter((p) => p.online || p.score > 0).length;
    if (n >= 2) reportResult(me, { key: `${code}:${s.game || 'quiz'}:left`, game: s.game || 'quiz', rank: n, players: n, win: false }).then((p) => p && onProfileUpdate && onProfileUpdate(p));
    onLeave();
  };
  const toLobby = async () => {
    if (await ask({ title: 'Alle zurück in die Lobby?', text: 'Das laufende Spiel endet für alle. Die Punkte bleiben stehen, bis ihr ein neues Spiel startet.', ok: 'Ja, zur Lobby', cancel: 'Weiterspielen' })) room.send('lobby');
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
  } else if (state.game === 'estimate') {
    body = <EstimateRoom room={room} me={me} code={code} />;
  } else if (state.game === 'emoji') {
    body = <EmojiRoom room={room} me={me} code={code} />;
  } else if (state.game === 'slf') {
    body = <SlfRoom room={room} me={me} code={code} />;
  } else if (state.game === 'songs') {
    body = <SongRoom room={room} me={me} code={code} />;
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
  // Neue Frage/Runde → manchmal ein Berliner Spruch oben
  const popKey = state && !['lobby', 'final', 'end', 'loading'].includes(state.phase)
    ? [state.game, state.round, state.idx, state.qIdx, state.turnId, state.current?.cat, state.current?.row, state.phase === 'write' || state.phase === 'play' || state.phase === 'question' ? 'q' : ''].join(':')
    : '';

  return (
    <div className="wrap">
      {toast && <div className="toast">{toast}</div>}
      <BerlinPop trigger={popKey} />
      {gain && <div key={gain.id} className="score-pop">+{gain.n}</div>}
      {reward && (
        <div key={reward.id} className="reward-pop">
          <div className="reward-pts">+{reward.pts}</div>
          <div className="reward-label">G-Punkte</div>
          {reward.say && <div className="reward-say">{reward.say}</div>}
          {reward.level && <div className="reward-level">Level {reward.level}! 🎉</div>}
        </div>
      )}
      <div className="topbar">
        <button className="icon-btn" onClick={leave} aria-label="Verlassen">←</button>
        <div className="row" style={{ gap: 8 }}>
          <div className="code-pill">{code}</div>
          {isHost && state.phase !== 'lobby' && (
            <button className="icon-btn" title="Spiel beenden" onClick={toLobby}>🏁</button>
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
