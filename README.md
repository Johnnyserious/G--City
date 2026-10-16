# G City

Spieleabend-App für die Gruppe: Spielezentrale, Avatar-Baukasten, Räume per Code, Quiz-Board mit Fragen-Datenbank, Joker, Veto, Revanche-Vote und Live-Chat.

Alle technischen Details stehen in **CLAUDE.md**.

## Einrichtung
1. Supabase → SQL Editor → Inhalt von `supabase/setup.sql` ausführen.
2. Vercel → Environment Variables: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (oder `..._PUBLISHABLE_KEY`), `SUPABASE_SECRET_KEY` → Redeploy.
3. `/admin` öffnen → Startpaket auffüllen.
