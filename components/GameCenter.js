'use client';
import { useEffect, useRef, useState } from 'react';
import { useIsDev, unlockWithPin } from './DevPanel';
import Avatar from './Avatar';
import IdeaBoard from './IdeaBoard';
import SupportSheet from './SupportSheet';
import { CoinChip } from './Shop';
import { sfx, haptic, isMuted, setMuted } from '@/lib/sound';
import { levelInfo } from '@/lib/player';

// Spiele in der Spielezentrale. mode: 'choose' = Ein Handy oder Online, sonst direkt online.
const GAMES = [
  { key: 'songs', cls: 'g-songs', emoji: '🎧', name: 'Songs erraten', tag: 'Ab 0,2 Sekunden – kennst du ihn?', choose: true, isNew: true },
  { key: 'quiz', cls: 'g-quiz', emoji: '🧠', name: 'Quiz-Board', tag: '5 Themen, Joker & Veto' },
  { key: 'imposter', cls: 'g-imp', emoji: '🕵️', name: 'Imposter', tag: 'Einer kennt das Wort nicht', choose: true },
  { key: 'meme', cls: 'g-meme', emoji: '😂', name: 'Make it Meme', tag: 'Betexten, bewerten, raten' },
  { key: 'draw', cls: 'g-draw', emoji: '🎨', name: 'Zeichenspiel', tag: 'Einer malt, alle raten' },
  { key: 'bluff', cls: 'g-bluff', emoji: '🤥', name: 'Lügen-Quiz', tag: 'Lüg besser als die anderen', choose: true },
  { key: 'emoji', cls: 'g-emoji', emoji: '🦁', name: 'Emoji-Rätsel', tag: '2–3 Emojis, ein Begriff' },
  { key: 'estimate', cls: 'g-est', emoji: '📏', name: 'Schätz-Duell', tag: 'Wer ist am nächsten dran?', choose: true },
];

// Weitere Apps aus der Gruppe – einfach hier ergänzen
const APPS = [
  { name: 'Eventradar', emoji: '📍', text: 'Was geht in Potsdam? Events für die Gruppe.', url: 'https://eventradar.club' },
];

export default function GameCenter({ me, onEdit, onProfile, onCreate, onJoin, onLocal, onShop, onDev }) {
  const isDev = useIsDev();
  const [code, setCode] = useState('');
  const [muted, setM] = useState(isMuted());
  const [choose, setChoose] = useState(null); // Spiel, für das Ein Handy / Online gewählt wird
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [support, setSupport] = useState(false);
  const [pinAsk, setPinAsk] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [toast, setToast] = useState(() => {
    // Einmal pro Besuch: „Willkommen zurück“
    try {
      if (sessionStorage.getItem('gc_welcomed')) return '';
      sessionStorage.setItem('gc_welcomed', '1');
      const old = me.createdAt && Date.now() - new Date(me.createdAt).getTime() > 10 * 60000;
      return me.registered && old ? `Willkommen zurück, ${me.name}! 👋` : '';
    } catch { return ''; }
  });
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);
  const taps = useRef([]);
  const lv = levelInfo(me.points || 0);

  // 5× schnell aufs Logo tippen → Dev-Mode (PIN, danach merkt sich das Handy)
  const logoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      haptic('success');
      if (isDev) { sfx.joker(); onDev(); } else { sfx.joker(); setPinAsk(true); }
    } else haptic('tap');
  };
  const tryPin = async () => {
    setPinErr('');
    try {
      await unlockWithPin(pin);
      sfx.correct();
      haptic('success');
      setPinAsk(false);
      setPin('');
      onDev();
    } catch (e) {
      sfx.wrong();
      haptic('error');
      setPinErr(String(e.message || e));
    }
  };

  const join = () => {
    if (code.length !== 4) return;
    sfx.join();
    haptic('success');
    onJoin(code);
  };
  const start = (g) => {
    sfx.pick();
    haptic('tap');
    if (g.choose) setChoose(g.key);
    else onCreate(g.key);
  };

  return (
    <div className="wrap center-page">
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <button className="logo logo-btn" onClick={logoTap} aria-label="G City">G <span>City</span></button>
        <div className="row" style={{ gap: 8 }}>
          {isDev && <button className="icon-btn" title="Dev-Mode" aria-label="Dev-Mode" onClick={() => { sfx.click(); onDev(); }}>🛠️</button>}
          <CoinChip onClick={() => { sfx.click(); onShop(); }} />
          <button className="icon-btn" onClick={() => { setMuted(!muted); setM(!muted); }} aria-label="Ton">{muted ? '🔇' : '🔊'}</button>
          <button className="me-btn" onClick={() => { sfx.click(); haptic('tap'); onProfile(); }} aria-label="Dein Profil">
            <Avatar avatar={me.avatar} size={46} />
            <span className="lvl-badge small">{lv.level}</span>
          </button>
        </div>
      </div>

      <div className="card join-card">
        <div className="join-title">Raum beitreten</div>
        <div className="row">
          <input
            className="input code-input"
            placeholder="CODE"
            maxLength={4}
            value={code}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && join()}
          />
          <button className="btn teal join-btn" disabled={code.length !== 4} onClick={join}>Rein ➜</button>
        </div>
      </div>

      <h2 className="section-title">Spiele</h2>
      <div className="games">
        {GAMES.map((g) => (
          <button key={g.key} className={'game-card ' + g.cls} onClick={() => start(g)}>
            {g.isNew && <span className="new-badge">NEU</span>}
            <span className="emoji">{g.emoji}</span>
            <h3>{g.name}</h3>
            <p>{g.tag}</p>
          </button>
        ))}
      </div>

      {choose && (
        <div className="overlay" onClick={() => setChoose(null)}>
          <div className="qcard stack pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2 style={{ fontSize: 30 }}>{{ songs: '🎧 Songs erraten', bluff: '🤥 Lügen-Quiz', estimate: '📏 Schätz-Duell', imposter: '🕵️ Imposter' }[choose]}</h2>
              <button className="icon-btn" onClick={() => setChoose(null)} aria-label="Schließen">✕</button>
            </div>
            <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Wie wollt ihr spielen?</p>
            <button className="mode-card" style={{ width: '100%' }} onClick={() => { sfx.pick(); haptic('tap'); setChoose(null); onLocal(choose); }}>
              <div className="big">📱 Ein Handy</div>
              <div style={{ fontWeight: 800 }}>{choose === 'songs' ? 'Ein Handy spielt die Songs ab, alle hören zu – du tippst an, wer zuerst richtig lag.' : 'Ihr sitzt zusammen und gebt ein Handy reihum weiter.'}</div>
            </button>
            <button className="mode-card" style={{ width: '100%' }} onClick={() => { sfx.pick(); haptic('tap'); setChoose(null); onCreate(choose); }}>
              <div className="big">🌐 Online</div>
              <div style={{ fontWeight: 800 }}>Jeder an seinem Handy, mit Raum-Code – oder gegen Bots.</div>
            </button>
          </div>
        </div>
      )}

      <div className="more-list">
        <button className="more-row" onClick={() => { sfx.click(); haptic('tap'); setIdeasOpen(!ideasOpen); }} aria-expanded={ideasOpen}>
          <span className="more-ico">💡</span>
          <span className="more-txt"><b>Was kommt als Nächstes?</b><span>Ideen voten oder selbst vorschlagen</span></span>
          <span className={'more-arrow' + (ideasOpen ? ' open' : '')}>›</span>
        </button>
        {ideasOpen && <div className="more-body"><IdeaBoard me={me} embedded /></div>}

        <button className="more-row" onClick={() => { sfx.click(); haptic('tap'); setSupport(true); }}>
          <span className="more-ico">🛠️</span>
          <span className="more-txt"><b>Fehler melden & Wünsche</b><span>Bug, Idee oder Verbesserung – geht direkt an die Entwicklung</span></span>
          <span className="more-arrow">›</span>
        </button>

        <div className="more-head">Unsere Apps</div>
        {APPS.map((a) => (
          <a key={a.name} className="more-row" href={a.url} target="_blank" rel="noopener noreferrer" onClick={() => haptic('tap')}>
            <span className="more-ico">{a.emoji}</span>
            <span className="more-txt"><b>{a.name}</b><span>{a.text}</span></span>
            <span className="more-arrow">↗</span>
          </a>
        ))}
      </div>

      <div className="center" style={{ marginTop: 22 }}>
        <div className="legal-links"><a href="/admin">Fragen-Datenbank</a> · <a href="/impressum">Impressum</a> · <a href="/agb">AGB</a> · <a href="/widerruf">Widerruf</a> · <a href="/datenschutz">Datenschutz</a></div>
      </div>

      {support && <SupportSheet me={me} onClose={(sent) => { setSupport(false); if (sent) { setToast('Danke! Ist angekommen 📬'); setTimeout(() => setToast(''), 2500); } }} />}

      {pinAsk && (
        <div className="overlay" onClick={() => setPinAsk(false)}>
          <div className="qcard stack pop-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h2 style={{ fontSize: 28 }}>🛠️ Dev-Mode</h2>
            <p className="muted" style={{ margin: 0, fontWeight: 700 }}>PIN eingeben. Danach merkt sich dieses Handy den Zugang.</p>
            <input className="input code-input" type="password" inputMode="numeric" autoFocus maxLength={12} value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && tryPin()} placeholder="PIN" />
            {pinErr && <div className="err-box">{pinErr}</div>}
            <button className="btn big full" disabled={!pin} onClick={tryPin}>Entsperren</button>
          </div>
        </div>
      )}
    </div>
  );
}
