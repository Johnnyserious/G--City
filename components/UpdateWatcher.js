'use client';
import { useEffect, useState } from 'react';

// Hält jede offene G-City-Seite aktuell – auch die App auf dem Home-Bildschirm.
// Prüft beim Zurückkommen in die App und jede Minute, ob eine neue Version online ist.
// Außerhalb eines Raums wird sofort neu geladen. In einem laufenden Raum erscheint ein Hinweis,
// damit niemandem mitten im Spiel die Seite wegspringt.
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID || '';

export default function UpdateWatcher({ inRoom }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!BUILD) return;
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState !== 'visible') return;
      try {
        const r = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        const { v } = await r.json();
        if (v && v !== BUILD) {
          if (inRoom) setReady(true);
          else window.location.reload();
        }
      } catch {}
    };
    check();
    const t = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, [inRoom]);

  if (!ready) return null;
  return (
    <button className="update-bar" onClick={() => window.location.reload()}>
      ✨ Neues Update ist da – <b>tippen zum Laden</b> (du bleibst im Raum)
    </button>
  );
}
