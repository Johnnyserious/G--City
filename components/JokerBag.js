'use client';
import { useState } from 'react';
import { useAccount, consumeItem } from '@/lib/account';
import { itemById } from '@/lib/shopCatalog';
import { canUseBought, boughtUsed, boughtAllowed } from '@/lib/shopGame';
import { sfx } from '@/lib/sound';

// Joker-Tasche im Spiel: zeigt nur Joker, die man besitzt und die hier passen.
export default function JokerBag({ room, me, items }) {
  const acc = useAccount();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const s = room.state;
  if (!acc.user || !acc.wallet || !boughtAllowed(s)) return null;
  const used = boughtUsed(s, me.id);
  const owned = items.filter((id) => acc.wallet.inventory?.[id] > 0);
  if (used) return <div className="bag"><span className="bag-note">🎒 Gekaufter Joker in diesem Spiel benutzt: {itemById(used)?.icon} {itemById(used)?.name}</span></div>;
  if (!owned.length) return null;

  const use = async (id) => {
    const why = canUseBought(s, me.id, id);
    if (why) { setMsg(why); return; }
    setBusy(id);
    setMsg('');
    try {
      await consumeItem(id);
      room.send('useBought', { item: id });
      sfx.joker();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally { setBusy(''); }
  };

  return (
    <div className="bag">
      <span className="bag-note">🎒 Joker-Tasche (1 pro Spiel):</span>
      {owned.map((id) => {
        const it = itemById(id);
        const why = canUseBought(s, me.id, id);
        return (
          <button key={id} className="bag-btn" disabled={!!why || !!busy} title={why || it.desc} onClick={() => use(id)}>
            {it.icon} {it.name.replace(/ \(.*\)/, '')} ×{acc.wallet.inventory[id]}
          </button>
        );
      })}
      {msg && <span className="bag-note" style={{ color: 'var(--red)' }}>{msg}</span>}
    </div>
  );
}

// Schalter für den Host in der Lobby
export function ShopToggle({ room, me }) {
  const s = room.state;
  const isHost = s.hostId === me.id;
  const on = boughtAllowed(s);
  return (
    <div className="card switch-row">
      <span>
        🎒 Gekaufte Joker erlauben
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Max. 1 pro Spieler und Spiel{isHost ? '' : ' · nur der Host kann das ändern'}</div>
      </span>
      <button className={'switch' + (on ? ' on' : '')} disabled={!isHost} aria-label="Gekaufte Joker erlauben" onClick={() => { sfx.click(); room.send('shopAllow', { on: !on }); }} />
    </div>
  );
}
