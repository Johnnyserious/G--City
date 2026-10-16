// Wer darf den Dev-Mode sehen? (E-Mail des eingeloggten G-City-Kontos)
// Der Server prüft das bei jeder Dev-Anfrage noch einmal (zusätzlich per DEV_EMAILS in Vercel erweiterbar).
export const DEV_EMAILS = ['jonas.goldenpost.media@gmail.com'];
export const isDevEmail = (email, extra = '') =>
  !!email && [...DEV_EMAILS, ...String(extra).split(',')].map((e) => e.trim().toLowerCase()).filter(Boolean).includes(String(email).toLowerCase());
export const REQUEST_TYPES = [
  { key: 'idee', icon: '💡', label: 'Idee' },
  { key: 'fehler', icon: '🐞', label: 'Fehler' },
  { key: 'aenderung', icon: '✏️', label: 'Änderung' },
];
