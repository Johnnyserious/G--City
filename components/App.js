'use client';
import { useEffect, useState } from 'react';
import DevPanel from './DevPanel';
import ProfileEditor from './ProfileEditor';
import GameCenter from './GameCenter';
import Room from './Room';
import ImposterLocal from './ImposterLocal';
import BluffLocal from './BluffLocal';
import EstimateLocal from './EstimateLocal';
import Shop from './Shop';
import ProfileSetup from './ProfileSetup';
import UpdateWatcher from './UpdateWatcher';
import ProfilePage from './ProfilePage';
import { haptic } from '@/lib/sound';
import { loadProfile, storeProfile, fetchProfile, saveRemote, merge } from '@/lib/player';
import { useAccount, shopApi } from '@/lib/account';
import { supabaseConfigured, MOCK } from '@/lib/supabase';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

function readRoom() {
  const r = new URLSearchParams(window.location.search).get('r');
  return r ? r.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) : null;
}

// Update-Prüfung läuft auf jedem Bildschirm (auch beim Profil-Popup)
export default function App() {
  const [inRoom, setInRoom] = useState(() => !!readRoom());
  useEffect(() => {
    const upd = () => setInRoom(!!readRoom());
    window.addEventListener('popstate', upd);
    const t = setInterval(upd, 2000);
    return () => { window.removeEventListener('popstate', upd); clearInterval(t); };
  }, []);
  return (
    <>
      <UpdateWatcher inRoom={inRoom} />
      <AppInner />
    </>
  );
}

function AppInner() {
  const [profile, setProfile] = useState(loadProfile);
  const [editing, setEditing] = useState(false);
  const [room, setRoom] = useState(readRoom);
  const [local, setLocal] = useState(null); // Spiel auf einem Handy, ohne Raum
  const [shop, setShop] = useState(() => new URLSearchParams(window.location.search).has('shop'));
  const [shopNotice, setShopNotice] = useState('');
  const [dev, setDev] = useState(false);
  const [page, setPage] = useState(null); // 'profile'
  const [setupLater, setSetupLater] = useState(false); // Server nicht erreichbar → erstmal ohne festes Profil weiter
  const acc = useAccount();

  // Festes Profil: im Hintergrund mit dem Server abgleichen (Punkte, Name)
  useEffect(() => {
    if (!profile?.registered) return;
    fetchProfile(profile.id)
      .then((r) => {
        if (r) setProfile((p) => storeProfile(merge(p, r)));
        // Profil auf dem Server verschwunden (z. B. Datenbank neu) → neu anlegen, Punkte starten bei 0
        else saveRemote(profile).then((n) => setProfile((p) => storeProfile(merge(p, n)))).catch(() => {});
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.registered]);

  // Rückkehr von Stripe: Kauf bestätigen und gutschreiben
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const result = q.get('shop');
    if (!result || !acc.ready) return;
    if (result === 'cancel') { setShopNotice('Kauf abgebrochen – es wurde nichts abgebucht.'); window.history.replaceState({}, '', window.location.pathname); return; }
    const sid = q.get('session_id');
    if (result === 'success' && sid && acc.token) {
      window.history.replaceState({}, '', window.location.pathname);
      shopApi('confirm', { sessionId: sid })
        .then((d) => setShopNotice(d.paid ? 'Danke! Dein Kauf ist gutgeschrieben 🎉' : 'Zahlung wird noch bearbeitet – die Münzen kommen gleich.'))
        .catch((e) => setShopNotice(String(e.message || e)));
    }
  }, [acc.ready, acc.token]);

  // Jeder Knopfdruck: kurze Vibration (Einstellung im Profil)
  useEffect(() => {
    const onDown = (e) => { if (e.target.closest?.('button, a, .seg-btn')) haptic('tap'); };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  useEffect(() => {
    const onPop = () => setRoom(readRoom());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const saveProfile = (p) => {
    setProfile(storeProfile(p));
    setEditing(false);
    // Name/Look auch auf dem Server ändern
    if (p.registered) saveRemote(p).then((r) => setProfile((x) => storeProfile(merge(x, r)))).catch(() => {});
  };
  const onProfileUpdate = (r) => setProfile((p) => storeProfile(merge(p, r)));
  const finishSetup = (p, err) => {
    setProfile(storeProfile(p));
    if (err) setSetupLater(true);
  };

  const goRoom = (code) => {
    window.history.pushState({}, '', '?r=' + code);
    setRoom(code);
  };
  const createRoom = (game = 'quiz') => {
    const code = makeCode();
    sessionStorage.setItem('qa_creator_' + code, '1');
    sessionStorage.setItem('qa_game_' + code, game);
    goRoom(code);
  };
  const leave = () => {
    window.history.pushState({}, '', window.location.pathname);
    setRoom(null);
  };

  if (!supabaseConfigured()) {
    return (
      <div className="wrap">
        <div className="card stack" style={{ marginTop: 40 }}>
          <h2>Fast fertig 🔧</h2>
          <p>Die Supabase-Werte fehlen noch. Trag in Vercel unter <b>Settings → Environment Variables</b> die Werte <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ein und klick danach auf <b>Redeploy</b>.</p>
        </div>
      </div>
    );
  }

  if (!profile || (!profile.registered && !setupLater)) {
    return <ProfileSetup local={profile} joining={!!room} onDone={finishSetup} />;
  }
  if (room) {
    return (
      <>
        <Room key={room} code={room} me={profile} isCreator={sessionStorage.getItem('qa_creator_' + room) === '1'} game={sessionStorage.getItem('qa_game_' + room) || 'quiz'} onLeave={leave} onEditProfile={() => setEditing(true)} onProfileUpdate={onProfileUpdate} />
        {editing && (
          <div className="overlay" style={{ display: 'block', zIndex: 80 }}>
            <ProfileEditor initial={profile} onSave={saveProfile} onCancel={() => setEditing(false)} />
          </div>
        )}
      </>
    );
  }
  if (dev) {
    return <DevPanel onClose={() => setDev(false)} onCreate={(g) => { setDev(false); createRoom(g); }} />;
  }
  if (shop) {
    return <Shop notice={shopNotice} onClose={() => { setShop(false); setShopNotice(''); }} />;
  }
  if (local === 'estimate') {
    return <EstimateLocal me={profile} onLeave={() => setLocal(null)} />;
  }
  if (local === 'bluff') {
    return <BluffLocal me={profile} onLeave={() => setLocal(null)} />;
  }
  if (local === 'imposter') {
    return <ImposterLocal me={profile} onLeave={() => setLocal(null)} />;
  }
  if (editing) {
    return <ProfileEditor initial={profile} onSave={saveProfile} onCancel={() => setEditing(false)} />;
  }
  if (page === 'profile') {
    return <ProfilePage me={profile} onClose={() => setPage(null)} onEdit={() => setEditing(true)} onUpdate={onProfileUpdate} />;
  }
  return <GameCenter me={profile} onEdit={() => setEditing(true)} onProfile={() => setPage('profile')} onCreate={createRoom} onJoin={goRoom} onLocal={setLocal} onShop={() => setShop(true)} onDev={() => setDev(true)} />;
}
