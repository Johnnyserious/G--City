'use client';
import { useState } from 'react';
import Avatar from './Avatar';
import ProfileEditor from './ProfileEditor';
import { sfx, haptic } from '@/lib/sound';
import { saveRemote, restoreRemote, merge } from '@/lib/player';

// Einmaliges Einrichten des festen Profils: neu anlegen oder per Code wiederherstellen.
// Danach erkennt G City das Handy automatisch.
export default function ProfileSetup({ local, joining, onDone }) {
  const [step, setStep] = useState(local ? 'upgrade' : 'choose'); // choose | create | restore | code | upgrade
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);

  const create = async (p) => {
    setBusy(true);
    setErr('');
    try {
      const remote = await saveRemote(p);
      const full = merge(p, remote);
      setResult(full);
      setStep('code');
      sfx.correct();
      haptic('success');
    } catch (e) {
      // Server nicht erreichbar oder Tabelle fehlt: erstmal nur auf dem Handy speichern
      setErr(String(e.message || e));
      onDone({ ...p, registered: false }, String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setErr('');
    try {
      const remote = await restoreRemote(code);
      sfx.correct();
      haptic('success');
      onDone(merge({}, remote));
    } catch (e) {
      setErr(String(e.message || e));
      sfx.wrong();
      haptic('error');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'create' || step === 'upgrade') {
    return (
      <div className="setup-wrap">
        <ProfileEditor
          initial={step === 'upgrade' ? local : null}
          joining={joining}
          busy={busy}
          title={step === 'upgrade' ? 'Dein festes Profil 🔒' : 'Erstell dein Profil'}
          subtitle={step === 'upgrade'
            ? 'Ab jetzt sammelst du Punkte, Siege und Achievements – über jedes Spiel hinweg. Einmal bestätigen, fertig.'
            : 'Einmal anlegen, danach erkennt G City dich automatisch. Punkte und Siege werden ab jetzt gezählt.'}
          saveLabel={step === 'upgrade' ? 'Profil sichern ✓' : 'Profil erstellen 🚀'}
          onSave={create}
          onCancel={step === 'create' ? () => setStep('choose') : null}
          footer={step === 'upgrade' && (
            <div className="center" style={{ marginTop: 14 }}>
              <button className="link-btn" onClick={() => setStep('restore')}>Ich hab schon ein Profil (Code eingeben)</button>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topbar"><div className="logo">G <span>City</span></div></div>
      {step === 'choose' && (
        <div className="card stack setup-card pop-in">
          <div style={{ fontSize: 64 }} className="center">🎮</div>
          <h1 className="center" style={{ fontSize: 36 }}>Willkommen in G City</h1>
          <p className="center muted" style={{ fontWeight: 700, margin: 0 }}>Leg einmal dein Profil an – danach bist du automatisch drin, mit allen Punkten und Siegen.</p>
          <button className="btn big full" onClick={() => { sfx.pick(); setStep('create'); }}>Profil erstellen 🚀</button>
          <button className="btn ghost full" onClick={() => { sfx.click(); setStep('restore'); }}>Ich hab schon ein Profil</button>
        </div>
      )}
      {step === 'restore' && (
        <div className="card stack setup-card pop-in">
          <h2 style={{ fontSize: 30 }}>Profil zurückholen</h2>
          <p className="muted" style={{ fontWeight: 700, margin: 0 }}>Gib deinen 6-stelligen Code ein. Du findest ihn auf deinem alten Handy unter <b>Profil</b>.</p>
          <input
            className="input code-input"
            placeholder="ABC123"
            maxLength={6}
            value={code}
            autoFocus
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && restore()}
          />
          {err && <div className="err-box">{err}</div>}
          <button className="btn big full teal" disabled={code.length !== 6 || busy} onClick={restore}>{busy ? '…' : 'Profil laden ➜'}</button>
          <button className="link-btn" onClick={() => { setErr(''); setStep(local ? 'upgrade' : 'choose'); }}>Zurück</button>
        </div>
      )}
      {step === 'code' && result && (
        <div className="card stack setup-card pop-in center">
          <Avatar avatar={result.avatar} size={110} />
          <h2 style={{ fontSize: 30 }}>Läuft, {result.name}! 🎉</h2>
          <p className="muted" style={{ fontWeight: 700, margin: 0 }}>Das ist dein Code, falls du mal ein neues Handy hast. Mach am besten einen Screenshot:</p>
          <div className="big-code">{result.code}</div>
          <p className="muted" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Du findest ihn auch jederzeit unter <b>Profil</b>.</p>
          <button className="btn big full" onClick={() => { sfx.join(); onDone(result); }}>Ab in die Spielezentrale ➜</button>
        </div>
      )}
    </div>
  );
}
