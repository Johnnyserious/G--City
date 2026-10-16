# G City

Spieleabend-App für die Gruppe: Spielezentrale, Avatar-Baukasten, Räume per Code, Quiz-Board mit KI-Fragen, Joker, Veto, Revanche-Vote und Live-Chat.

## Umgebungsvariablen (in Vercel eintragen)
- `ANTHROPIC_API_KEY` – Schlüssel aus console.anthropic.com
- `NEXT_PUBLIC_SUPABASE_URL` – aus Supabase → Connect
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) – aus Supabase → Connect
- optional `ANTHROPIC_MODEL` – Standard: `claude-haiku-5-5`

## Lokal testen ohne Konten
`NEXT_PUBLIC_MOCK=1 npm run build && MOCK_AI=1 npm start` – dann mehrere Tabs öffnen (jeder Tab = eigener Spieler).
