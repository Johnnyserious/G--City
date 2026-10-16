'use client';
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '@/lib/engine';

const COST_PER_Q = 0.0002; // grob in US-Dollar mit Claude Haiku 5.5 (inkl. Eingabe)
const STOPS = [
  { v: 100, label: 'Startpaket: 100 pro Thema' },
  { v: 500, label: '500 pro Thema' },
  { v: 1000, label: '1.000 pro Thema' },
  { v: 2000, label: 'Ziel: 2.000 pro Thema' },
];
const icon = (name) => CATEGORIES.find((c) => c.name === name)?.icon || '❓';

export default function Admin() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  const [stopAt, setStopAt] = useState(100);
  const [added, setAdded] = useState(0);
  const [log, setLog] = useState([]);
  const runRef = useRef(false);

  const load = async () => {
    try {
      const r = await fetch('/api/refill?status=1');
      const d = await r.json();
      setData(d);
      setErr(d.error || '');
    } catch (e) {
      setErr(String(e));
    }
  };
  useEffect(() => { load(); }, []);

  const minPerCat = (d) => (d?.perCategory?.length ? Math.min(...d.perCategory.map((c) => c.total)) : 0);

  const start = async () => {
    runRef.current = true;
    setRunning(true);
    let fails = 0;
    let batches = 4;
    while (runRef.current) {
      try {
        const r = await fetch('/api/refill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ batches }) });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        setData((old) => ({ ...old, ...d }));
        setAdded((a) => a + (d.added || 0));
        if (d.errors?.length) setLog((l) => [new Date().toLocaleTimeString() + ' – ' + d.errors[0], ...l].slice(0, 6));
        // Anthropic-Limit erreicht → langsamer machen und kurz warten
        if (d.errors?.some((e) => /429|überlastet|zu viele/i.test(e))) {
          batches = Math.max(1, batches - 1);
          await new Promise((r) => setTimeout(r, 20000));
          continue;
        }
        fails = d.added ? 0 : fails + 1;
        if (minPerCat(d) >= stopAt || d.tried === 0) break;
        if (fails >= 5) { setLog((l) => ['5× nichts hinzugefügt – gestoppt. Bitte Fehler oben prüfen.', ...l]); break; }
      } catch (e) {
        setLog((l) => [new Date().toLocaleTimeString() + ' – ' + String(e.message || e), ...l].slice(0, 6));
        if (++fails >= 5) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    runRef.current = false;
    setRunning(false);
    load();
  };

  const total = data?.total || 0;
  const target = data?.target || 1;
  const pct = Math.min(100, (total / target) * 100);
  const remainingToStop = data?.perCategory ? data.perCategory.reduce((s, c) => s + Math.max(0, stopAt - c.total), 0) : 0;

  return (
    <div className="wrap">
      <div className="topbar">
        <a href="/" className="icon-btn" style={{ textDecoration: 'none', color: 'var(--ink)' }}>←</a>
        <div className="logo">G <span>City</span></div>
        <div style={{ width: 44 }} />
      </div>
      <h1 style={{ fontSize: 36, marginBottom: 6 }}>Fragen-Datenbank</h1>
      <p className="muted" style={{ marginTop: 0, fontWeight: 700 }}>Hier füllt Claude die Datenbank auf. Im Spiel kommen die Fragen dann sofort und kosten nichts mehr.</p>

      {data && data.configured === false && (
        <div className="card stack">
          <h3>Noch nicht eingerichtet</h3>
          <p>In Vercel fehlt die Umgebungsvariable <b>SUPABASE_SECRET_KEY</b>. Danach einmal <b>Redeploy</b>.</p>
        </div>
      )}
      {err && <div className="card" style={{ border: '3px solid var(--red)', marginBottom: 14, fontWeight: 700 }}>⚠️ {err}</div>}

      {data?.configured && data.perCategory && (
        <div className="stack">
          <div className="card stack">
            <div className="row between">
              <div className="display" style={{ fontSize: 30 }}>{total.toLocaleString('de-DE')} Fragen</div>
              <div className="muted" style={{ fontWeight: 800 }}>Ziel {target.toLocaleString('de-DE')}</div>
            </div>
            <div className="timer" style={{ height: 16 }}><div style={{ width: pct + '%', background: 'var(--teal)' }} /></div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select className="input" style={{ maxWidth: 320, fontSize: 16 }} value={stopAt} disabled={running} onChange={(e) => setStopAt(Number(e.target.value))}>
                {STOPS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
              {!running ? (
                <button className="btn green" onClick={start}>▶ Auffüllen starten</button>
              ) : (
                <button className="btn red" onClick={() => { runRef.current = false; }}>■ Stoppen</button>
              )}
            </div>
            <div className="muted" style={{ fontWeight: 700, fontSize: 14 }}>
              Noch {remainingToStop.toLocaleString('de-DE')} Fragen bis zur Auswahl – ca. {(remainingToStop * COST_PER_Q).toFixed(2)} $ · Ganz voll (2.000 pro Thema) kostet insgesamt ca. {(target * COST_PER_Q).toFixed(0)} $.
              {running && <> · Läuft … diesen Tab offen lassen. Diese Sitzung: +{added}</>}
            </div>
            {log.map((l, i) => <div key={i} style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>{l}</div>)}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 22, marginBottom: 10 }}>Pro Thema <span className="muted" style={{ fontSize: 14 }}>(Balken = Stufe 1 bis 5)</span></h3>
            {data.perCategory.map((c) => (
              <div key={c.category} className="row" style={{ padding: '6px 0', borderBottom: '1px solid #ffffff10' }}>
                <span style={{ width: 26 }}>{icon(c.category)}</span>
                <span style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{c.category}</span>
                <div style={{ display: 'flex', gap: 3, width: 140 }}>
                  {c.levels.map((l, i) => (
                    <div key={i} title={`Stufe ${i + 1}: ${l.total} (${l.unused} ungenutzt)`} style={{ flex: 1, height: 12, borderRadius: 4, background: '#120b30', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, (l.total / (data.targetPerCategory / 5)) * 100) + '%', background: 'var(--yellow)' }} />
                    </div>
                  ))}
                </div>
                <span style={{ width: 70, textAlign: 'right', fontFamily: 'var(--display)' }}>{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!data && !err && <div className="thinking"><div className="dice">🎲</div></div>}
    </div>
  );
}
