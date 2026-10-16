'use client';
import { useEffect, useState } from 'react';
import ProfileEditor from './ProfileEditor';
import GameCenter from './GameCenter';
import Room from './Room';
import ImposterLocal from './ImposterLocal';
import BluffLocal from './BluffLocal';
import EstimateLocal from './EstimateLocal';
import Shop from './Shop';
import { useAccount, shopApi } from '@/lib/account';
import { supabaseConfigured, MOCK } from '@/lib/supabase';

// Im Testmodus pro Tab ein eigenes Profil
const store = () => (MOCK ? sessionStorage : localStorage);

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

function loadProfile() {
  try {
    const p = JSON.parse(store().getItem('qa_profile') || 'null');
    if (p && p.id && p.name && p.avatar) return p;
  } catch {}
  return null;
}

function readRoom() {
  const r = new URLSearchParams(window.location.search).get('r');
  return r ? r.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) : null;
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [editing, setEditing] = useState(false);
  const [room, setRoom] = useState(readRoom);
  const [local, setLocal] = useState(null); // Spiel auf einem Handy, ohne Raum
  const [shop, setShop] = useState(() => new URLSearchParams(window.location.search).has('shop'));
  const [shopNotice, setShopNotice] = useState('');
  const acc = useAccount();

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

  useEffect(() => {
    const onPop = () => setRoom(readRoom());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const saveProfile = (p) => {
    store().setItem('qa_profile', JSON.stringify(p));
    setProfile(p);
    setEditing(false);
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

  if (!profile) {
    return <ProfileEditor initial={null} onSave={saveProfile} onCancel={null} joining={!!room} />;
  }
  if (room) {
    return (
      <>
        <Room key={room} code={room} me={profile} isCreator={sessionStorage.getItem('qa_creator_' + room) === '1'} game={sessionStorage.getItem('qa_game_' + room) || 'quiz'} onLeave={leave} onEditProfile={() => setEditing(true)} />
        {editing && (
          <div className="overlay" style={{ display: 'block', zIndex: 80 }}>
            <ProfileEditor initial={profile} onSave={saveProfile} onCancel={() => setEditing(false)} />
          </div>
        )}
      </>
    );
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
  return <GameCenter me={profile} onEdit={() => setEditing(true)} onCreate={createRoom} onJoin={goRoom} onLocal={setLocal} onShop={() => setShop(true)} />;
}
