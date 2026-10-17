// Nur auf dem Server: Dev-Inbox. Aufträge aus G City werden GitHub-Issues (Label "dev-inbox").
// Claude arbeitet sie auf Zuruf ab: Branch dev/<nr>, Pull Request, Vercel baut eine Vorschau.
// "Live schalten" im Dev-Mode merged den Pull Request → Vercel veröffentlicht auf g-city.vercel.app.
import { isMock } from './questions';
import { userFromReq } from './wallet';
import { isDevEmail } from './dev';
import { createHmac, timingSafeEqual } from 'crypto';

const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').replace(/^[A-Z_]+=/, '');
const repo = () => clean(process.env.GITHUB_REPO) || 'Johnnyserious/G--City';
const LABEL = 'dev-inbox';

// Dev-Mode ohne Shop-Login: PIN (Vercel: DEV_PIN) → Schlüssel, den sich das Handy merkt
const devPin = () => clean(process.env.DEV_PIN) || (isMock() ? '1234' : '');
export const devKey = () => (devPin() ? createHmac('sha256', devPin()).update('g-city-dev-mode').digest('hex') : '');
const same = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
export async function unlockDev(pin) {
  if (!devPin()) throw new Error('DEV_PIN fehlt noch in Vercel – Anleitung im Chat mit Claude.');
  if (!same(String(pin || '').trim(), devPin())) {
    await new Promise((r) => setTimeout(r, 800)); // Raten bremsen
    return null;
  }
  return devKey();
}

export async function devUser(req) {
  const key = req.headers.get('x-dev-key');
  if (key && devKey() && same(key, devKey())) return { email: 'Dev-PIN' };
  const u = await userFromReq(req);
  if (!u) return null;
  if (isMock() && /jonas/i.test(u.email)) return u;
  return isDevEmail(u.email, process.env.DEV_EMAILS) ? u : null;
}

async function gh(path, method = 'GET', body) {
  const token = clean(process.env.GITHUB_TOKEN);
  if (!token) throw new Error('GITHUB_TOKEN fehlt in Vercel – Anleitung im Chat mit Claude.');
  const r = await fetch('https://api.github.com/repos/' + repo() + path, {
    method,
    headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const d = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('GitHub: ' + (d.message || r.status));
  return d;
}

// ---------- Testspeicher (lokal) ----------
const mem = () => (globalThis.__gcityDev = globalThis.__gcityDev || { items: [], n: 1 });

async function previewUrl(sha) {
  try {
    const deps = await gh(`/deployments?sha=${sha}&per_page=5`);
    for (const d of deps) {
      const st = await gh(`/deployments/${d.id}/statuses?per_page=5`);
      const ok = st.find((x) => x.state === 'success' && (x.environment_url || x.target_url));
      if (ok) return ok.environment_url || ok.target_url;
      if (st.some((x) => ['pending', 'in_progress', 'queued'].includes(x.state))) return 'building';
    }
  } catch {}
  return null;
}

export async function listRequests() {
  if (isMock()) return mem().items;
  const issues = await gh(`/issues?labels=${LABEL}&state=all&per_page=25&sort=created&direction=desc`);
  const pulls = await gh('/pulls?state=all&per_page=50&sort=created&direction=desc');
  return Promise.all(
    issues.filter((i) => !i.pull_request).map(async (i) => {
      const pr = pulls.find((p) => p.head?.ref === `dev/${i.number}`);
      let comment = null;
      if (i.comments) {
        const cs = await gh(`/issues/${i.number}/comments?per_page=100`);
        const last = cs[cs.length - 1];
        if (last) comment = { body: last.body, at: last.created_at };
      }
      let status = 'wartet';
      let preview = null;
      if (pr?.merged_at) status = 'live';
      else if (pr && pr.state === 'open') { status = 'vorschau'; preview = await previewUrl(pr.head.sha); }
      else if (i.state === 'closed') status = 'geschlossen';
      else if (comment && !comment.body.startsWith('**Jonas')) status = 'rückfrage';
      return { number: i.number, title: i.title, body: i.body, type: (i.body || '').match(/Art: (\w+)/)?.[1] || '', created: i.created_at, status, comment, pr: pr ? pr.number : null, preview };
    }),
  );
}

export async function createRequest(user, { title, text, type }) {
  title = String(title || '').trim().slice(0, 120);
  text = String(text || '').trim().slice(0, 4000);
  if (title.length < 3) throw new Error('Bitte einen kurzen Titel eingeben');
  const body = `${text}\n\n---\nArt: ${type || 'idee'}\nVon: ${user.email} (G City Dev-Mode)\n\n_Claude: auf Branch \`dev/<Nummer>\` umsetzen, Pull Request mit „Closes #<Nummer>“ öffnen, kurz kommentieren, was gemacht wurde._`;
  if (isMock()) {
    const m = mem();
    const item = { number: m.n++, title, body, type, created: new Date().toISOString(), status: 'wartet', comment: null, pr: null, preview: null };
    m.items.unshift(item);
    return item.number;
  }
  const i = await gh('/issues', 'POST', { title, body, labels: [LABEL] });
  return i.number;
}

// Support-Knopf in der Spielezentrale: jeder Spieler kann Fehler/Wünsche melden → landet in der Inbox.
const SUPPORT_KINDS = { fehler: '🐞 Fehler', wunsch: '✨ Wunsch', idee: '💡 Idee' };
const recent = new Map(); // IP → Zeitpunkte (gegen Spam)
export async function createSupport({ kind, text, name, profileId, game, device }, ip = '') {
  text = String(text || '').trim().slice(0, 2000);
  if (text.length < 5) throw new Error('Schreib bitte ein bisschen mehr (mind. 5 Zeichen).');
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 3600000);
  if (list.length >= 8) throw new Error('Danke, das reicht erstmal – probier es in einer Stunde nochmal.');
  recent.set(ip, [...list, now]);
  const label = SUPPORT_KINDS[kind] || SUPPORT_KINDS.wunsch;
  const who = String(name || 'Unbekannt').slice(0, 30);
  const first = text.split('\n')[0].slice(0, 70);
  const title = `[Support] ${label}: ${first}`;
  return createRequest({ email: who }, {
    title,
    text: `${text}\n\n**Gemeldet von:** ${who} (Profil ${String(profileId || '-').slice(0, 40)})${game ? `\n**Im Spiel:** ${String(game).slice(0, 40)}` : ''}\n**Gerät:** ${String(device || '').slice(0, 160)}\n\n_Hinweis für Claude: Meldung von einem Spieler, nicht von Jonas – größere Änderungen erst mit Jonas abstimmen._`,
    type: kind === 'fehler' ? 'fehler' : 'idee',
  });
}

export async function goLive(number) {
  if (isMock()) {
    const it = mem().items.find((x) => x.number === number);
    if (it) it.status = 'live';
    return;
  }
  const pulls = await gh(`/pulls?state=open&head=${repo().split('/')[0]}:dev/${number}`);
  const pr = pulls[0];
  if (!pr) throw new Error('Noch keine Vorschau für diesen Auftrag.');
  await gh(`/pulls/${pr.number}/merge`, 'PUT', { merge_method: 'squash', commit_title: `${pr.title} (#${pr.number})` });
  await gh(`/issues/${number}`, 'PATCH', { state: 'closed' }).catch(() => {});
}

export async function discard(number) {
  if (isMock()) {
    const it = mem().items.find((x) => x.number === number);
    if (it) it.status = 'geschlossen';
    return;
  }
  const pulls = await gh(`/pulls?state=open&head=${repo().split('/')[0]}:dev/${number}`);
  for (const p of pulls) await gh(`/pulls/${p.number}`, 'PATCH', { state: 'closed' });
  await gh(`/issues/${number}/comments`, 'POST', { body: 'Von Jonas im Dev-Mode verworfen.' });
  await gh(`/issues/${number}`, 'PATCH', { state: 'closed' });
}

export async function reply(number, text) {
  text = String(text || '').trim().slice(0, 2000);
  if (!text) throw new Error('Leere Antwort');
  if (isMock()) {
    const it = mem().items.find((x) => x.number === number);
    if (it) { it.comment = { body: '**Jonas:** ' + text, at: new Date().toISOString() }; it.status = 'wartet'; }
    return;
  }
  await gh(`/issues/${number}/comments`, 'POST', { body: '**Jonas (Dev-Mode):** ' + text });
}
