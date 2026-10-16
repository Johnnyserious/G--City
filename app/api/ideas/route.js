import { listIdeas, setVote, addIdea, deleteIdea } from '@/lib/ideas';

export const dynamic = 'force-dynamic';

const fail = (e) => Response.json({ error: String(e.message || e) }, { status: 400 });

// Alle Ideen mit Stimmen
export async function GET() {
  try {
    return Response.json({ ideas: await listIdeas() });
  } catch (e) {
    return fail(e);
  }
}

// { action: 'vote', key, on, voter } | { action: 'add', title, text, author } | { action: 'delete', key, author }
export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action === 'vote') await setVote({ key: b.key, voter: b.voter, on: !!b.on });
    else if (b.action === 'add') await addIdea({ title: b.title, text: b.text, author: b.author });
    else if (b.action === 'delete') await deleteIdea({ key: b.key, author: b.author });
    else throw new Error('Unbekannte Aktion');
    return Response.json({ ideas: await listIdeas() });
  } catch (e) {
    return fail(e);
  }
}
