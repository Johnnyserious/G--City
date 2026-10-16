// Nur auf dem Server benutzt: Fragen-Datenbank (Supabase) + Fragen-Erzeugung mit Claude.
import { createClient } from '@supabase/supabase-js';
import { askClaude, extractJson } from './claude';
import { CATEGORY_NAMES } from './engine';

export const TARGET_PER_LEVEL = 400; // 5 Stufen × 400 = 2000 Fragen pro Thema
export const BATCH_SIZE = 10; // Fragen pro Claude-Aufruf
export const LOW_WATER = 8; // weniger ungenutzte Fragen als das → im Hintergrund nachfüllen

export const LEVELS = {
  1: 'MACHBAR, ABER NICHT GESCHENKT – die meisten aus der Gruppe kommen nach kurzem Nachdenken drauf. Bekanntes Basiswissen, das man aus Alltag, Schule (Unterstufe) oder Popkultur kennt. Keine Kinderfrage, aber auch keine Falle.',
  2: 'LEICHT – fast alle aus der Gruppe wissen es oder kommen nach kurzem Überlegen drauf. Bekanntes Alltags-, Schul- oder Popkulturwissen, nur einen Tick weniger offensichtlich als Stufe 1.',
  3: 'LEICHT BIS MITTEL – die meisten aus der Gruppe wissen es. Bekanntes Wissen aus Schule, Nachrichten, Filmen, Sport oder Alltag, das man als normaler Mensch schon mal gehört hat. Kein Pauk-Wissen.',
  4: 'MITTEL – ungefähr die Hälfte der Gruppe weiß es. Solides Allgemeinwissen aus der Schule (Mittelstufe) oder dem Alltag. Wer es nicht sicher weiß, kann es mit etwas Nachdenken oder Ausschlussverfahren herleiten.',
  5: 'ETWAS ANSPRUCHSVOLLER, ABER GUT LÖSBAR – jemand mit gutem Allgemeinwissen weiß es, und auch die anderen haben eine echte Chance. Bekannte Fakten, Personen, Orte und Werke, nur nicht die allererste, offensichtlichste Frage zum Thema. KEINE Expertenfrage, keine genauen Jahreszahlen, Zahlen, Statistiken, Nebenfiguren oder Nischen-Details.',
};

const RULES = `Zielgruppe: eine Gruppe junger Erwachsener zwischen 18 und 30 in Deutschland, Schulbildung bis Abitur.
Stil: unterhaltsam und interessant, gern mit einem "Ach, krass!"-Effekt, sodass man nebenbei etwas lernt. Alles auf Schul-/Abiturniveau oder aus dem Alltag und der Popkultur – keine Experten- oder Nischenfragen.
Halte dich STRENG an die verlangte Schwierigkeitsstufe. Im Zweifel lieber etwas LEICHTER als zu schwer: Die Gruppe soll die meisten Fragen beantworten können und Spaß haben, nicht frustriert raten.
Regeln für jede Frage:
- Die Fakten müssen absolut korrekt und eindeutig sein. Im Zweifel nimm eine andere Frage.
- Die Antwort ist kurz (1–4 Wörter oder eine Zahl).
- Keine Fragen zu Ereignissen nach 2024 und keine, deren Antwort sich schnell ändert (aktuelle Tabellen, Rekorde, Amtsinhaber usw.).
- Die Frage verrät die Antwort nicht.
- "hint" ist ein hilfreicher Tipp, der die Antwort NICHT direkt nennt.
- "options" sind genau 4 Antwortmöglichkeiten, eine davon exakt "answer", die anderen plausibel aber eindeutig falsch.
- "aliases" sind weitere akzeptierte Schreibweisen der richtigen Antwort (z. B. Nachname allein, englischer Name, Zahl als Wort).
- "explanation" ist ein kurzer, interessanter Satz Hintergrundwissen.`;

const SYSTEM_BATCH = `Du bist Autor für eine Quiz-Show und schreibst MEHRERE Quizfragen auf Deutsch auf einmal.
${RULES}
- Jede Frage behandelt ein ANDERES Unterthema der Kategorie. Abwechslung ist Pflicht.
Antworte NUR mit JSON in diesem Format:
{"questions":[{"question":"...","answer":"...","aliases":["..."],"hint":"...","options":["...","...","...","..."],"explanation":"..."}]}`;

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

// Frage in einheitliche Form bringen, ungültige verwerfen
export function normalizeQ(q) {
  if (!q || typeof q.question !== 'string' || typeof q.answer !== 'string') return null;
  const question = q.question.trim();
  const answer = q.answer.trim();
  if (!question || !answer || question.length > 400 || answer.length > 80) return null;
  let options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
  options = [...new Set(options)];
  if (!options.includes(answer)) options = [answer, ...options.filter((o) => o !== answer)];
  options = options.slice(0, 4);
  if (!options.includes(answer)) options[options.length - 1] = answer;
  return {
    id: q.id,
    question,
    answer,
    aliases: Array.isArray(q.aliases) ? q.aliases.map(String).filter(Boolean).slice(0, 8) : [],
    hint: (q.hint && String(q.hint).trim()) || 'Kein Tipp verfügbar',
    options: shuffle(options),
    explanation: q.explanation ? String(q.explanation).trim() : '',
  };
}

const genModel = () => process.env.GEN_MODEL || process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

// Claude schreibt mehrere Fragen für ein Thema + eine Stufe
export async function generateBatch(category, level, n = BATCH_SIZE, avoid = []) {
  const seed = Math.floor(Math.random() * 100000);
  const user = `Kategorie: ${category}
Schwierigkeit: ${level}/5 – ${LEVELS[level] || LEVELS[3]}
Anzahl: ${n}
Zufallszahl ${seed}: nutze sie, um überraschende, abwechslungsreiche Unterthemen zu wählen, nicht immer das Naheliegendste.
${avoid.length ? 'Diese Fragen gibt es schon, schreib etwas ganz anderes:\n- ' + avoid.slice(0, 40).join('\n- ') : ''}`;
  const text = await askClaude(SYSTEM_BATCH, user, Math.min(8000, 400 + n * 330), genModel());
  const data = extractJson(text);
  const list = Array.isArray(data.questions) ? data.questions : [];
  return list.map(normalizeQ).filter(Boolean).map((q) => ({ ...q, category, level }));
}

// ---------------- Datenbank ----------------

const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();

let admin = null;
const isMock = () => process.env.MOCK_DB === '1';

export function dbConfigured() {
  if (isMock()) return true;
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  return !!(url && key);
}

function db() {
  if (admin) return admin;
  let url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  if (url && !/^https?:\/\//.test(url)) url = 'https://' + url;
  const key = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY).replace(/^SUPABASE_[A-Z_]+=/, '');
  if (!url || !key) return null;
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

// Für lokale Tests: einfache Datenbank im Arbeitsspeicher
function mock() {
  if (!globalThis.__gcityMock) globalThis.__gcityMock = { rows: [], id: 1 };
  return globalThis.__gcityMock;
}
const pickFrom = (rows, n) =>
  rows
    .map((r) => [r, r.times_used, Math.random()])
    .sort((a, b) => a[1] - b[1] || a[2] - b[2])
    .slice(0, n)
    .map(([r]) => {
      r.times_used++;
      return { ...r };
    });

async function rpc(name, args) {
  if (isMock()) {
    const m = mock();
    if (name === 'pick_questions') {
      const out = [];
      for (const c of args.p_categories)
        for (let l = 1; l <= 5; l++) out.push(...pickFrom(m.rows.filter((r) => r.category === c && r.level === l), args.p_per_level));
      return out;
    }
    if (name === 'pick_question')
      return pickFrom(m.rows.filter((r) => r.category === args.p_category && r.level === args.p_level && !args.p_exclude.includes(r.question)), 1);
    if (name === 'add_questions') {
      let n = 0;
      for (const q of args.p_items) {
        if (m.rows.some((r) => r.category === q.category && r.question.toLowerCase() === q.question.toLowerCase())) continue;
        m.rows.push({ ...q, id: m.id++, times_used: 0 });
        n++;
      }
      return n;
    }
    if (name === 'question_counts') {
      const map = {};
      for (const r of m.rows) {
        const k = r.category + '|' + r.level;
        map[k] = map[k] || { category: r.category, level: r.level, total: 0, unused: 0 };
        map[k].total++;
        if (!r.times_used) map[k].unused++;
      }
      return Object.values(map);
    }
  }
  const client = db();
  if (!client) throw new Error('Datenbank nicht eingerichtet (SUPABASE_SECRET_KEY fehlt)');
  const { data, error } = await client.rpc(name, args);
  if (error) {
    if (/function .* does not exist|Could not find the function/i.test(error.message))
      throw new Error('Die Fragen-Tabelle fehlt noch: Bitte supabase/setup.sql im Supabase SQL Editor ausführen.');
    throw new Error('Datenbank: ' + error.message);
  }
  return data;
}

async function recentQuestions(category, level, n = 40) {
  if (isMock()) return mock().rows.filter((r) => r.category === category && r.level === level).slice(-n).map((r) => r.question);
  const client = db();
  if (!client) return [];
  const { data } = await client.from('questions').select('question').eq('category', category).eq('level', level).order('id', { ascending: false }).limit(n);
  return (data || []).map((r) => r.question);
}

export async function pickBoard(categories, perLevel = 2) {
  const rows = await rpc('pick_questions', { p_categories: categories, p_per_level: perLevel });
  return (rows || []).map((r) => ({ ...normalizeQ(r), category: r.category, level: r.level }));
}

export async function pickOne(category, level, exclude = []) {
  const rows = await rpc('pick_question', { p_category: category, p_level: level, p_exclude: exclude.slice(-200) });
  return rows && rows[0] ? normalizeQ(rows[0]) : null;
}

export async function addQuestions(items) {
  if (!items.length) return 0;
  const clean = items.map(({ category, level, question, answer, aliases, hint, options, explanation }) => ({ category, level, question, answer, aliases, hint, options, explanation }));
  return (await rpc('add_questions', { p_items: clean })) || 0;
}

export async function counts() {
  const rows = (await rpc('question_counts', {})) || [];
  const map = {};
  for (const r of rows) map[r.category + '|' + r.level] = { total: Number(r.total), unused: Number(r.unused) };
  return map;
}

// Erzeugen + speichern. Gibt die neuen Fragen zurück.
export async function generateAndStore(category, level, n = BATCH_SIZE) {
  const avoid = dbConfigured() ? await recentQuestions(category, level).catch(() => []) : [];
  const qs = await generateBatch(category, level, n, avoid);
  let added = 0;
  if (dbConfigured()) added = await addQuestions(qs).catch(() => 0);
  return { qs, added };
}

// Füllt die Kombinationen (Thema+Stufe) mit den wenigsten Fragen auf.
// only: optional Liste von Themen; lowWater: nur auffüllen, wenn weniger ungenutzte Fragen da sind.
export async function refill({ batches = 4, only = null, lowWater = null } = {}) {
  const c = await counts();
  const combos = [];
  for (const cat of only || CATEGORY_NAMES)
    for (let l = 1; l <= 5; l++) {
      const v = c[cat + '|' + l] || { total: 0, unused: 0 };
      if (v.total >= TARGET_PER_LEVEL) continue;
      if (lowWater != null && v.unused >= lowWater) continue;
      combos.push({ cat, level: l, total: v.total, unused: v.unused, r: Math.random() });
    }
  combos.sort((a, b) => (lowWater != null ? a.unused - b.unused : a.total - b.total) || a.r - b.r);
  const chosen = combos.slice(0, batches);
  const results = await Promise.allSettled(chosen.map((x) => generateAndStore(x.cat, x.level)));
  let added = 0;
  const errors = [];
  results.forEach((r) => (r.status === 'fulfilled' ? (added += r.value.added) : errors.push(String(r.reason?.message || r.reason))));
  return { added, tried: chosen.length, errors };
}

export async function overview() {
  const c = await counts();
  const perCategory = CATEGORY_NAMES.map((cat) => {
    const levels = [1, 2, 3, 4, 5].map((l) => c[cat + '|' + l] || { total: 0, unused: 0 });
    return { category: cat, levels, total: levels.reduce((s, x) => s + x.total, 0) };
  });
  const total = perCategory.reduce((s, x) => s + x.total, 0);
  return { perCategory, total, target: CATEGORY_NAMES.length * 5 * TARGET_PER_LEVEL, targetPerCategory: 5 * TARGET_PER_LEVEL };
}
