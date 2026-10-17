// Welche Version ist gerade online? Wird vom Browser regelmäßig abgefragt (components/UpdateWatcher.js).
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ v: process.env.NEXT_PUBLIC_BUILD_ID || '' }, { headers: { 'Cache-Control': 'no-store' } });
}
