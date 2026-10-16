import { refill, overview, dbConfigured, BATCH_SIZE } from '@/lib/questions';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// GET  /api/refill          → täglicher Cron: füllt ein paar Pakete auf
// GET  /api/refill?status=1 → nur Übersicht
// POST /api/refill          → Auffüllen von der Admin-Seite aus (ein Schritt)
export async function GET(req) {
  if (!dbConfigured()) return Response.json({ configured: false });
  try {
    const status = new URL(req.url).searchParams.get('status');
    if (status) return Response.json({ configured: true, ...(await overview()) });
    const r = await refill({ batches: 5 });
    return Response.json({ configured: true, ...r });
  } catch (e) {
    return Response.json({ configured: true, error: String(e.message || e) }, { status: 500 });
  }
}

export async function POST(req) {
  if (!dbConfigured()) return Response.json({ configured: false });
  try {
    const { batches = 4 } = await req.json().catch(() => ({}));
    const r = await refill({ batches: Math.max(1, Math.min(6, Number(batches) || 4)) });
    const o = await overview();
    return Response.json({ configured: true, ...r, batchSize: BATCH_SIZE, ...o });
  } catch (e) {
    return Response.json({ configured: true, error: String(e.message || e) }, { status: 500 });
  }
}
