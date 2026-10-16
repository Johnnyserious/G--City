'use client';
import { useState } from 'react';
import Avatar from './Avatar';
import IdeaBoard from './IdeaBoard';
import { sfx, isMuted, setMuted } from '@/lib/sound';

export default function GameCenter({ me, onEdit, onCreate, onJoin, onLocal }) {
  const [code, setCode] = useState('');
  const [muted, setM] = useState(isMuted());
  const [toast, setToast] = useState('');
  const [choose, setChoose] = useState(false);

  const soon = (name) => {
    sfx.click();
    setToast(name + ' kommt in Phase 2 🔒');
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="wrap">
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <div className="logo">G <span>City</span></div>
        <div className="row">
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
          <button className="row" onClick={onEdit} style={{ background: 'var(--card2)', borderRadius: 99, padding: '4px 14px 4px 4px', fontWeight: 800 }}>
            <Avatar avatar={me.avatar} size={38} /> {me.name} ✏️
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: 44, margin: '10px 0 4px' }}>Spielezentrale</h1>
      <p className="muted" style={{ marginTop: 0, fontWeight: 700 }}>Such dir ein Spiel aus und hol die Jungs rein.</p>

      <IdeaBoard me={me} />

      <h2 style={{ fontSize: 28, margin: '22px 0 12px' }}>Spiele</h2>
      <div className="games">
        <button className="game-card g-quiz" onClick={() => { sfx.pick(); onCreate('quiz'); }}>
          <span className="tag">▶ Spielbar</span>
          <span className="emoji">🧠</span>
          <h3>Quiz-Board</h3>
          <p>5 zufällige Themen, Joker, Veto und Revanche. Je mehr Punkte, desto härter.</p>
        </button>
        <button className="game-card g-imp" onClick={() => { sfx.pick(); setChoose(true); }}>
          <span className="tag">▶ Spielbar</span>
          <span className="emoji">🕵️</span>
          <h3>Imposter</h3>
          <p>Einer kennt das Wort nicht. Oder mehrere. Oder keiner.</p>
        </button>
        <button className="game-card g-panto locked" onClick={() => soon('Pantomime')}>
          <span className="tag">🔒 Bald</span>
          <span className="emoji">🎭</span>
          <h3>Pantomime</h3>
          <p>Ohne Worte erklären, die anderen raten.</p>
        </button>
      </div>

      {choose && (
        <div className="overlay" onClick={() => setChoose(false)}>
          <div className="qcard stack" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2 style={{ fontSize: 30 }}>🕵️ Imposter</h2>
              <button className="icon-btn" onClick={() => setChoose(false)} aria-label="Schließen">✕</button>
            </div>
            <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Wie wollt ihr spielen?</p>
            <button className="mode-card" style={{ width: '100%' }} onClick={() => { sfx.pick(); setChoose(false); onLocal('imposter'); }}>
              <div className="big">📱 Ein Handy</div>
              <div style={{ fontWeight: 800 }}>Ihr sitzt zusammen und gebt ein Handy reihum weiter.</div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Kein Raum, kein Internet für die anderen nötig.</div>
            </button>
            <button className="mode-card" style={{ width: '100%' }} onClick={() => { sfx.pick(); setChoose(false); onCreate('imposter'); }}>
              <div className="big">🌐 Online</div>
              <div style={{ fontWeight: 800 }}>Jeder an seinem eigenen Handy, Wörter werden eingetippt.</div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Mit Raum-Code, Chat und Abstimmung.</div>
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 22 }}>
        <h3 style={{ fontSize: 24, marginBottom: 10 }}>Raum beitreten</h3>
        <div className="row">
          <input
            className="input"
            style={{ letterSpacing: 6, textTransform: 'uppercase', fontFamily: 'var(--display)', fontSize: 26 }}
            placeholder="CODE"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length === 4 && onJoin(code)}
          />
          <button className="btn teal" disabled={code.length !== 4} onClick={() => { sfx.join(); onJoin(code); }}>Rein ➜</button>
        </div>
      </div>
      <div className="center" style={{ marginTop: 18 }}>
        <a href="/admin" className="muted" style={{ fontWeight: 800, fontSize: 14 }}>⚙️ Fragen-Datenbank</a>
      </div>
    </div>
  );
}
