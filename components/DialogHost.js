'use client';
import { useEffect, useState } from 'react';
import { onDialog } from '@/lib/dialog';
import { sfx, haptic } from '@/lib/sound';

export default function DialogHost() {
  const [d, setD] = useState(null);
  useEffect(() => onDialog((x) => { haptic('light'); setD(x); }), []);
  if (!d) return null;
  const close = (v) => { d.resolve(v); setD(null); };
  return (
    <div className="overlay dialog-overlay" onClick={() => close(null)}>
      <div className="qcard stack pop-in dialog-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 style={{ fontSize: 26 }}>{d.title}</h2>
        {d.text && <p className="muted" style={{ margin: 0, fontWeight: 700 }}>{d.text}</p>}
        <div className="stack" style={{ marginTop: 6 }}>
          {d.options.map((o, i) => (
            <button key={i} className={'btn full ' + (o.cls ?? (i === 0 ? '' : 'ghost'))} onClick={() => { sfx.click(); close(o.value); }}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>{o.label}</span>
                {o.sub && <span style={{ fontFamily: 'var(--body)', fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{o.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
