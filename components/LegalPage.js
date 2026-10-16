import { SELLER } from '@/lib/legal';

// Platzhalter "[…]" werden gelb markiert, damit man sieht, was noch fehlt
export function V({ k }) {
  const v = SELLER[k] || '';
  return v.startsWith('[') ? <span className="todo">{v}</span> : <>{v}</>;
}

export default function LegalPage({ title, children }) {
  return (
    <div className="wrap legal">
      <div className="topbar">
        <a href="/" className="icon-btn" aria-label="Zurück" style={{ textDecoration: 'none' }}>←</a>
        <div className="logo">G <span>City</span></div>
        <div style={{ width: 44 }} />
      </div>
      <div className="card">
        <h1 style={{ fontSize: 34, marginBottom: 10 }}>{title}</h1>
        {children}
      </div>
      <div className="center legal-links" style={{ marginTop: 16 }}><a href="/impressum">Impressum</a> · <a href="/agb">AGB</a> · <a href="/widerruf">Widerruf</a> · <a href="/datenschutz">Datenschutz</a></div>
    </div>
  );
}
