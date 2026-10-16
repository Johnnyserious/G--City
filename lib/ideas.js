// Nur auf dem Server: Spielideen + Stimmen in Supabase (Tabellen game_ideas, idea_votes).
import { db, isMock, dbConfigured } from './questions';
import { BUILTIN_IDEAS, LIMITS } from './gameIdeas';

const mock = () => {
  if (!globalThis.__gcityIdeas) globalThis.__gcityIdeas = { ideas: [], votes: [], id: 1 };
  return globalThis.__gcityIdeas;
};

const clip = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n);
const missingTable = (e) => /relation .* does not exist|Could not find the table|schema cache/i.test(e?.message || '');
const SETUP_MSG = 'Die Ideen-Tabellen fehlen noch: Bitte supabase/ideas.sql im Supabase SQL Editor ausführen.';

function client() {
  const c = db();
  if (!c) throw new Error('Datenbank nicht eingerichtet (SUPABASE_SECRET_KEY fehlt)');
  return c;
}
const check = (res) => {
  if (res.error) throw new Error(missingTable(res.error) ? SETUP_MSG : 'Datenbank: ' + res.error.message);
  return res.data;
};

export async function listIdeas() {
  let custom, votes;
  if (isMock()) {
    custom = mock().ideas;
    votes = mock().votes;
  } else {
    if (!dbConfigured()) throw new Error('Datenbank nicht eingerichtet (SUPABASE_SECRET_KEY fehlt)');
    const c = client();
    [custom, votes] = await Promise.all([
      c.from('game_ideas').select('id,title,description,author_id,author_name,created_at').order('id').limit(300).then(check),
      c.from('idea_votes').select('idea_key,voter_id,voter_name,voter_avatar').limit(5000).then(check),
    ]);
  }
  const ideas = [
    ...BUILTIN_IDEAS.map((i) => ({ key: i.key, emoji: i.emoji, title: i.title, text: i.text, planned: !!i.planned })),
    ...custom.map((i) => ({ key: 'u' + i.id, emoji: '💡', title: i.title, text: i.description || '', author: i.author_name || 'Jemand', authorId: i.author_id, custom: true })),
  ];
  const keys = new Set(ideas.map((i) => i.key));
  const byIdea = {};
  for (const v of votes) {
    if (!keys.has(v.idea_key)) continue;
    (byIdea[v.idea_key] = byIdea[v.idea_key] || []).push({ id: v.voter_id, name: v.voter_name, avatar: v.voter_avatar });
  }
  return ideas.map((i) => ({ ...i, voters: byIdea[i.key] || [] }));
}

export async function setVote({ key, voter, on }) {
  key = clip(key, 40);
  if (!key || !voter?.id) throw new Error('Ungültige Stimme');
  const row = { idea_key: key, voter_id: clip(voter.id, 60), voter_name: clip(voter.name, 30), voter_avatar: voter.avatar || null };
  if (isMock()) {
    const m = mock();
    m.votes = m.votes.filter((v) => !(v.idea_key === key && v.voter_id === row.voter_id));
    if (on) m.votes.push(row);
    return;
  }
  const c = client();
  if (on) check(await c.from('idea_votes').upsert(row, { onConflict: 'idea_key,voter_id' }));
  else check(await c.from('idea_votes').delete().eq('idea_key', key).eq('voter_id', row.voter_id));
}

export async function addIdea({ title, text, author }) {
  title = clip(title, LIMITS.title);
  text = clip(text, LIMITS.text);
  if (title.length < 2) throw new Error('Bitte einen Namen für die Idee eingeben');
  if (!author?.id) throw new Error('Profil fehlt');
  const row = { title, description: text, author_id: clip(author.id, 60), author_name: clip(author.name, 30) };
  let id;
  if (isMock()) {
    const m = mock();
    if (m.ideas.filter((i) => i.author_id === row.author_id).length >= LIMITS.ideasPerPerson) throw new Error(`Maximal ${LIMITS.ideasPerPerson} Ideen pro Person`);
    id = m.id++;
    m.ideas.push({ ...row, id });
  } else {
    const c = client();
    const { count } = await c.from('game_ideas').select('id', { count: 'exact', head: true }).eq('author_id', row.author_id);
    if ((count || 0) >= LIMITS.ideasPerPerson) throw new Error(`Maximal ${LIMITS.ideasPerPerson} Ideen pro Person`);
    id = check(await c.from('game_ideas').insert(row).select('id').single()).id;
  }
  // Wer eine Idee schreibt, stimmt automatisch dafür
  await setVote({ key: 'u' + id, voter: author, on: true });
  return 'u' + id;
}

// Eigene Idee wieder löschen
export async function deleteIdea({ key, author }) {
  const id = Number(String(key || '').replace(/^u/, ''));
  if (!id || !author?.id) throw new Error('Ungültig');
  if (isMock()) {
    const m = mock();
    m.ideas = m.ideas.filter((i) => !(i.id === id && i.author_id === author.id));
    m.votes = m.votes.filter((v) => v.idea_key !== key);
    return;
  }
  const c = client();
  const del = check(await c.from('game_ideas').delete().eq('id', id).eq('author_id', author.id).select('id'));
  if (del?.length) check(await c.from('idea_votes').delete().eq('idea_key', 'u' + id));
}
