'use client';
import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { sfx, haptic, hapticsEnabled, setHaptics } from '@/lib/sound';
import { fetchProfile, levelInfo, titleFor, G_POINTS } from '@/lib/player';
import { passkeysSupported, passkeyLabel, registerPasskey } from '@/lib/passkeyClient';

const GAME_NAMES = {
  quiz: ['🧠', 'Quiz-Board'], imposter: ['🕵️', 'Imposter'], meme: ['😂', 'Make it Meme'], draw: ['🎨', 'Zeichenspiel'],
  bluff: ['🤥', 'Lügen-Quiz'], emoji: ['🦁', 'Emoji-Rätsel'], estimate: ['📏', 'Schätz-Duell'], songs: ['🎧', 'Songs erraten'], slf: ['🏙️', 'Stadt, Land, Fluss'],
};
const fmt = (n) => Number(n || 0).toLocaleString('de-DE');

export default function ProfilePage({ me, onClose, onEdit, onUpdate }) {
  const [p, setP] = useState(me);
  const [vib, setVib] = useState(hapticsEnabled());
  const [showCode, setShowCode] = useState(false);
  const [pkMsg, setPkMsg] = useState('');
  const [pkBusy, setPkBusy] = useState(false);
  const fid = passkeyLabel();
  const setupFace = async () => {
    setPkBusy(true);
    setPkMsg('');
    try {
      await registerPasskey(p.id);
      setP((x) => ({ ...x, passkeys: (x.passkeys || 0) + 1 }));
      setPkMsg(`✅ ${fid} ist eingerichtet`);
      sfx.correct();
      haptic('success');
    } catch (e) {
      setPkMsg(String(e.message || e));
    } finally {
      setPkBusy(false);
    }
  };
  useEffect(() => {
    if (!me.registered) return;
    fetchProfile(me.id).then((r) => { if (r) { setP((x) => ({ ...x, ...r })); onUpdate && onUpdate(r); } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  const lv = levelInfo(p.points || 0);
  const games = Object.entries(p.stats || {}).sort((a, b) => (b[1].games || 0) - (a[1].games || 0));
  const rate = p.games ? Math.round(((p.wins || 0) / p.games) * 100) : 0;

  return (
    <div className="wrap">
      <div className="topbar">
        <button className="icon-btn" onClick={() => { sfx.click(); onClose(); }} aria-label="Zurück">←</button>
        <div className="logo">Profil</div>
        <button className="icon-btn" onClick={() => { sfx.click(); onEdit(); }} aria-label="Look ändern">✏️</button>
      </div>

      <div className="card profile-hero pop-in">
        <div className="profile-avatar"><Avatar avatar={p.avatar} size={120} /><span className="lvl-badge">{lv.level}</span></div>
        <h1 style={{ fontSize: 36 }}>{p.name}</h1>
        <div className="title-chip">{titleFor(lv.level)}</div>
        <div className="xp-bar"><div style={{ width: lv.pct + '%' }} /></div>
        <div className="muted" style={{ fontWeight: 800, fontSize: 13 }}>Level {lv.level} · noch {fmt(lv.need - lv.into)} G-Punkte bis Level {lv.level + 1}</div>
      </div>

      <div className="stat-grid">
        <div className="stat"><b>{fmt(p.points)}</b><span>G-Punkte gesamt</span></div>
        <div className="stat"><b>{fmt(p.games)}</b><span>Spiele</span></div>
        <div className="stat"><b>{fmt(p.wins)}</b><span>Siege</span></div>
        <div className="stat"><b>{rate}%</b><span>Siegquote</span></div>
      </div>

      {!p.registered && (
        <div className="card err-box" style={{ marginTop: 14 }}>Dein Profil ist bisher nur auf diesem Handy gespeichert – die Punkte werden gezählt, sobald die Verbindung zum Server klappt.</div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 22, marginBottom: 10 }}>Deine Spiele</h3>
        {games.length === 0 ? (
          <div className="muted" style={{ fontWeight: 700 }}>Noch keine Spiele gezählt. Leg los – jedes Online-Spiel bringt G-Punkte.</div>
        ) : (
          <div className="rank-list">
            {games.map(([k, v]) => (
              <div key={k}>
                <span style={{ fontSize: 24 }}>{GAME_NAMES[k]?.[0] || '🎮'}</span>
                <span style={{ flex: 1, fontWeight: 800 }}>{GAME_NAMES[k]?.[1] || k}</span>
                <span className="meme-stat">{fmt(v.games)} Spiele</span>
                <span className="meme-stat">🏆 {fmt(v.wins)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginTop: 10 }}>
          G-Punkte pro Spiel: {G_POINTS.play} fürs Mitspielen, Platz 1 +{G_POINTS.place[0]}, Platz 2 +{G_POINTS.place[1]}, Platz 3 +{G_POINTS.place[2]}. So zählt jedes Spiel gleich viel.
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 22, marginBottom: 6 }}>🏆 Achievements</h3>
        <div className="muted" style={{ fontWeight: 700 }}>Kommen mit dem nächsten Update – deine Spiele ab heute zählen schon mit.</div>
      </div>

      <div className="card stack" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 22 }}>Einstellungen</h3>
        <label className="row between toggle-row">
          <span style={{ fontWeight: 800 }}>📳 Vibration</span>
          <input type="checkbox" checked={vib} onChange={(e) => { setVib(e.target.checked); setHaptics(e.target.checked); if (e.target.checked) haptic('success'); }} />
        </label>
        {p.registered && passkeysSupported() && (
          <div>
            <div style={{ fontWeight: 800 }}>😎 Anmelden mit {fid}</div>
            <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {p.passkeys ? `Eingerichtet auf ${p.passkeys} ${p.passkeys === 1 ? 'Gerät' : 'Geräten'}. Auf einem neuen Handy oder nach dem Neu-Anlegen der App einfach „Anmelden mit ${fid}“ tippen.` : `Statt Code: ein Blick ins Handy und du bist drin. Dein Gesicht bzw. Finger bleibt auf dem Handy.`}
            </div>
            <button className="btn teal small" disabled={pkBusy} onClick={setupFace}>{pkBusy ? '…' : p.passkeys ? `Auf diesem Gerät neu einrichten` : `${fid} einrichten`}</button>
            {pkMsg && <div className="muted" style={{ fontWeight: 800, marginTop: 8 }}>{pkMsg}</div>}
          </div>
        )}
        {p.registered && (
          <div>
            <div style={{ fontWeight: 800 }}>📱 Code für ein neues Handy</div>
            <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Auf dem neuen Handy „Ich hab schon ein Profil“ wählen und diesen Code eingeben. Nicht weitergeben!</div>
            {showCode ? <div className="big-code">{p.code}</div> : <button className="btn ghost small" onClick={() => setShowCode(true)}>Code anzeigen 👀</button>}
          </div>
        )}
      </div>
    </div>
  );
}
