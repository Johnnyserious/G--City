'use client';
import { useEffect, useState } from 'react';
import { useAccount, signIn, signUp, signOut, resetPassword, setNewPassword, shopApi, refreshWallet } from '@/lib/account';
import { ITEMS, COIN_PACKS, BUNDLES, DAILY_BONUS, euro, itemById, bundleWorth } from '@/lib/shopCatalog';
import { sfx } from '@/lib/sound';

export function CoinChip({ onClick }) {
  const acc = useAccount();
  return (
    <button className="coin-chip" onClick={onClick} aria-label="Shop">
      🪙 {acc.user ? (acc.wallet ? acc.wallet.coins.toLocaleString('de-DE') : '…') : 'Shop'}
      {acc.user && acc.wallet?.canDaily && <span className="badge" style={{ top: -8, right: -8 }}>!</span>}
    </button>
  );
}

function Auth() {
  const acc = useAccount();
  const [mode, setMode] = useState('login'); // login | register | reset
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (acc.recovery) { await setNewPassword(pw); setMsg('Passwort geändert ✓'); }
      else if (mode === 'login') await signIn(email.trim(), pw);
      else if (mode === 'register') {
        const r = await signUp(email.trim(), pw);
        if (r.needsConfirm) setMsg('Fast geschafft! Wir haben dir eine E-Mail geschickt. Klick auf den Link darin, dann kannst du dich hier einloggen.');
      } else { await resetPassword(email.trim()); setMsg('Wir haben dir einen Link zum Zurücksetzen geschickt.'); }
    } catch (e) {
      setErr(String(e.message || e));
    } finally { setBusy(false); }
  };

  if (acc.recovery) {
    return (
      <div className="card stack">
        <h3 style={{ fontSize: 24 }}>Neues Passwort</h3>
        <input className="input" type="password" placeholder="Neues Passwort (mind. 6 Zeichen)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        {err && <div className="idea-error">{err}</div>}
        {msg && <div className="hint-box" style={{ margin: 0 }}>{msg}</div>}
        <button className="btn full" disabled={busy || pw.length < 6} onClick={go}>Speichern</button>
      </div>
    );
  }
  return (
    <div className="card stack">
      <div className="seg">
        <button className={'seg-btn' + (mode === 'login' ? ' on' : '')} onClick={() => setMode('login')}>Einloggen</button>
        <button className={'seg-btn' + (mode === 'register' ? ' on' : '')} onClick={() => setMode('register')}>Konto erstellen</button>
      </div>
      <p className="muted" style={{ margin: 0, fontWeight: 700 }}>
        {mode === 'register' ? 'Mit Konto bleiben deine Münzen und Joker gespeichert – auch auf einem anderen Handy. Spielen geht weiter ohne Konto.' : mode === 'reset' ? 'Gib deine E-Mail ein, du bekommst einen Link für ein neues Passwort.' : 'Logg dich ein, um Münzen und Joker zu nutzen.'}
      </p>
      <input className="input" type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      {mode !== 'reset' && (
        <input className="input" type="password" placeholder={mode === 'register' ? 'Passwort (mind. 6 Zeichen)' : 'Passwort'} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
      )}
      {err && <div className="idea-error">{err}</div>}
      {msg && <div className="hint-box" style={{ margin: 0 }}>{msg}</div>}
      <button className="btn full" disabled={busy || !email.includes('@') || (mode !== 'reset' && pw.length < 6)} onClick={go}>
        {busy ? '…' : mode === 'login' ? 'Einloggen' : mode === 'register' ? 'Konto erstellen' : 'Link schicken'}
      </button>
      {mode === 'login' && <button className="link-btn" onClick={() => setMode('reset')}>Passwort vergessen?</button>}
      {mode === 'reset' && <button className="link-btn" onClick={() => setMode('login')}>Zurück zum Login</button>}
    </div>
  );
}

export default function Shop({ onClose, notice }) {
  const acc = useAccount();
  const [tab, setTab] = useState('joker');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(notice || '');
  const [err, setErr] = useState('');
  const w = acc.wallet;
  const mode = w?.mode;

  useEffect(() => { if (acc.user) refreshWallet(); }, [acc.user]);
  useEffect(() => { if (notice) setToast(notice); }, [notice]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t); }, [toast]);

  const run = async (key, fn) => {
    setErr(''); setBusy(key);
    try { await fn(); } catch (e) { setErr(String(e.message || e)); sfx.wrong(); } finally { setBusy(''); }
  };
  const daily = () => run('daily', async () => { await shopApi('daily'); sfx.fanfare(); setToast(`+${DAILY_BONUS} Münzen 🎁`); });
  const buy = (item) => run(item.id, async () => { await shopApi('buy', { item: item.id }); sfx.correct(); setToast(`${item.icon} ${item.name} gekauft`); });
  const checkout = (product) => run(product, async () => {
    if (!consent) throw new Error('Bitte setz zuerst das Häkchen unten bei den Hinweisen.');
    const d = await shopApi('checkout', { product, consent: true });
    window.location.href = d.url;
  });

  return (
    <div className="wrap">
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <button className="icon-btn" onClick={onClose} aria-label="Zurück">←</button>
        <div className="logo">G <span>Shop</span></div>
        <div style={{ width: 44 }} />
      </div>

      {!acc.ready ? (
        <div className="thinking"><div className="dice">🪙</div></div>
      ) : !acc.user || acc.recovery ? (
        <Auth />
      ) : (
        <div className="stack">
          <div className="card wallet-card">
            <div>
              <div className="muted" style={{ fontWeight: 800, fontSize: 13 }}>{acc.user.email}</div>
              <div className="display" style={{ fontSize: 40 }}>🪙 {w ? w.coins.toLocaleString('de-DE') : '…'}</div>
            </div>
            {w?.canDaily ? (
              <button className="btn green" disabled={busy === 'daily'} onClick={daily}>🎁 +{DAILY_BONUS} gratis</button>
            ) : (
              <div className="muted" style={{ fontWeight: 800, fontSize: 13, textAlign: 'right' }}>Tagesbonus abgeholt ✓<br />Morgen wieder</div>
            )}
          </div>
          {mode === 'test' && <div className="hint-box" style={{ margin: 0 }}>🧪 <b>Testmodus:</b> Es wird kein echtes Geld abgebucht. Bezahlen mit Testkarte <b>4242 4242 4242 4242</b>, beliebiges Datum in der Zukunft, beliebige Prüfziffer.</div>}
          {mode === 'missing' && <div className="idea-error">Echtgeld-Käufe sind noch nicht eingerichtet. Joker mit Münzen kaufen geht trotzdem.</div>}
          {acc.error && <div className="idea-error">{acc.error}</div>}
          {err && <div className="idea-error">{err}</div>}

          <div className="seg">
            <button className={'seg-btn' + (tab === 'joker' ? ' on' : '')} onClick={() => setTab('joker')}>🃏 Joker</button>
            <button className={'seg-btn' + (tab === 'coins' ? ' on' : '')} onClick={() => setTab('coins')}>🪙 Münzen</button>
            <button className={'seg-btn' + (tab === 'bundles' ? ' on' : '')} onClick={() => setTab('bundles')}>🎁 Bundles</button>
          </div>

          {tab === 'joker' && (
            <>
              <p className="muted" style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Gekaufte Joker landen in deiner Joker-Tasche. Pro Spiel kannst du einen davon einsetzen – wenn der Host es erlaubt.</p>
              <div className="shop-grid">
                {ITEMS.map((it) => (
                  <div key={it.id} className="card shop-item">
                    <div className="row between"><span style={{ fontSize: 34 }}>{it.icon}</span>{w?.inventory?.[it.id] ? <span className="chip" style={{ background: 'var(--card2)' }}>Du hast {w.inventory[it.id]}</span> : null}</div>
                    <b>{it.name}</b>
                    <div className="muted" style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{it.desc}</div>
                    <button className="btn small full" disabled={busy === it.id || !w || w.coins < it.price} onClick={() => buy(it)}>🪙 {it.price}</button>
                  </div>
                ))}
              </div>
              {w && w.coins < 20 && <button className="btn full ghost" onClick={() => setTab('coins')}>Zu wenig Münzen? Münzen holen ➜</button>}
            </>
          )}

          {tab === 'coins' && (
            <div className="shop-grid">
              {COIN_PACKS.map((p) => (
                <div key={p.id} className="card shop-item center">
                  {p.tag && <span className="chip shop-tag">{p.tag}</span>}
                  <div style={{ fontSize: 40 }}>🪙</div>
                  <div className="display" style={{ fontSize: 26 }}>{p.label}</div>
                  <button className="btn pink full" disabled={!!busy || mode === 'missing'} onClick={() => checkout(p.id)}>{busy === p.id ? '…' : euro(p.cents)}</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'bundles' && (
            <div className="stack">
              {BUNDLES.map((b) => (
                <div key={b.id} className="card shop-bundle">
                  <div className="row between">
                    <div className="display" style={{ fontSize: 26 }}>{b.icon} {b.name}</div>
                    <span className="chip shop-tag" style={{ position: 'static' }}>Wert 🪙 {bundleWorth(b).toLocaleString('de-DE')}</span>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(b.items).map(([id, n]) => <span key={id} className="bluff-picker">{itemById(id)?.icon} {n}× {itemById(id)?.name}</span>)}
                    {b.coins ? <span className="bluff-picker">🪙 +{b.coins}</span> : null}
                  </div>
                  <button className="btn pink full" disabled={!!busy || mode === 'missing'} onClick={() => checkout(b.id)}>{busy === b.id ? '…' : euro(b.cents)}</button>
                </div>
              ))}
            </div>
          )}

          {tab !== 'joker' && (
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Ich bin mindestens 18 Jahre alt oder habe die Erlaubnis meiner Eltern. Ich stimme zu, dass G City mit der Lieferung der digitalen Inhalte sofort beginnt, und weiß, dass ich dadurch mein Widerrufsrecht verliere. Es gelten die <a href="/agb" target="_blank">AGB</a>, die <a href="/widerruf" target="_blank">Widerrufsbelehrung</a> und der <a href="/datenschutz" target="_blank">Datenschutz</a>.
              </span>
            </label>
          )}

          <div className="center stack" style={{ marginTop: 20 }}>
            <button className="btn small ghost" onClick={() => signOut()}>Ausloggen</button>
            <div className="legal-links"><a href="/impressum">Impressum</a> · <a href="/agb">AGB</a> · <a href="/widerruf">Widerruf</a> · <a href="/datenschutz">Datenschutz</a></div>
          </div>
        </div>
      )}
    </div>
  );
}
