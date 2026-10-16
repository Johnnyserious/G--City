-- G City: Tabellen für die Spielideen-Abstimmung.
-- Einmal im Supabase SQL Editor ausführen (kann gefahrlos mehrmals laufen).
create table if not exists public.game_ideas (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  author_id text,
  author_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.idea_votes (
  idea_key text not null,
  voter_id text not null,
  voter_name text,
  voter_avatar jsonb,
  created_at timestamptz not null default now(),
  primary key (idea_key, voter_id)
);
alter table public.game_ideas enable row level security;
alter table public.idea_votes enable row level security;
