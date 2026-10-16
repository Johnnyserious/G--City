-- G City: Fragen-Datenbank
-- Einmal komplett im Supabase SQL Editor ausführen (kann gefahrlos mehrmals laufen).

create table if not exists public.questions (
  id bigint generated always as identity primary key,
  category text not null,
  level smallint not null check (level between 1 and 5),
  question text not null,
  answer text not null,
  aliases jsonb not null default '[]'::jsonb,
  hint text,
  options jsonb not null default '[]'::jsonb,
  explanation text,
  times_used integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Keine doppelten Fragen pro Thema
create unique index if not exists questions_unique_text on public.questions (category, lower(question));
create index if not exists questions_pick on public.questions (category, level, times_used);

-- Nur der Server (mit Secret Key) darf an die Tabelle
alter table public.questions enable row level security;

-- Für ein ganzes Board: pro Thema und Stufe die am wenigsten benutzten Fragen ziehen
create or replace function public.pick_questions(p_categories text[], p_per_level integer default 2)
returns setof public.questions
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select q.id,
           row_number() over (partition by q.category, q.level order by q.times_used, random()) as rn
    from public.questions q
    where q.category = any (p_categories)
  ), upd as (
    update public.questions q
       set times_used = q.times_used + 1,
           last_used_at = now()
      from ranked r
     where q.id = r.id and r.rn <= p_per_level
    returning q.*
  )
  select * from upd;
$$;

-- Für ein einzelnes Feld (Fallback / Frage-Tausch)
create or replace function public.pick_question(p_category text, p_level integer, p_exclude text[] default '{}')
returns setof public.questions
language sql
security definer
set search_path = public
as $$
  with chosen as (
    select q.id
      from public.questions q
     where q.category = p_category
       and q.level = p_level
       and not (q.question = any (p_exclude))
     order by q.times_used, random()
     limit 1
  ), upd as (
    update public.questions q
       set times_used = q.times_used + 1,
           last_used_at = now()
      from chosen c
     where q.id = c.id
    returning q.*
  )
  select * from upd;
$$;

-- Neue Fragen einfügen, Doppelte werden still übersprungen. Gibt die Anzahl neuer Fragen zurück.
create or replace function public.add_questions(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.questions (category, level, question, answer, aliases, hint, options, explanation)
  select i->>'category',
         (i->>'level')::smallint,
         i->>'question',
         i->>'answer',
         coalesce(i->'aliases', '[]'::jsonb),
         i->>'hint',
         coalesce(i->'options', '[]'::jsonb),
         i->>'explanation'
    from jsonb_array_elements(p_items) as i
   where coalesce(i->>'question', '') <> '' and coalesce(i->>'answer', '') <> ''
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Übersicht: wie viele Fragen gibt es pro Thema und Stufe
create or replace function public.question_counts()
returns table (category text, level smallint, total bigint, unused bigint)
language sql
security definer
set search_path = public
as $$
  select q.category, q.level, count(*), count(*) filter (where q.times_used = 0)
    from public.questions q
   group by q.category, q.level;
$$;

-- Die Funktionen sind nur für den Server gedacht
revoke execute on function public.pick_questions(text[], integer) from public, anon, authenticated;
revoke execute on function public.pick_question(text, integer, text[]) from public, anon, authenticated;
revoke execute on function public.add_questions(jsonb) from public, anon, authenticated;
revoke execute on function public.question_counts() from public, anon, authenticated;
grant execute on function public.pick_questions(text[], integer) to service_role;
grant execute on function public.pick_question(text, integer, text[]) to service_role;
grant execute on function public.add_questions(jsonb) to service_role;
grant execute on function public.question_counts() to service_role;

-- ============ Spielideen-Abstimmung (Spielezentrale) ============
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
