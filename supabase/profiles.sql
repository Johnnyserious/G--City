-- G City: feste Spielerprofile (Gesamtpunkte, Siege, Wiederherstellungs-Code)
-- Einmal komplett im Supabase SQL Editor ausführen (kann gefahrlos mehrmals laufen).

create table if not exists public.profiles (
  id text primary key,                       -- Profil-ID aus dem Browser
  name text not null,
  avatar jsonb not null default '{}'::jsonb,
  code text not null unique,                 -- 6-stelliger Code für ein neues Handy
  points bigint not null default 0,          -- Punkte seit dem ersten Spiel
  games integer not null default 0,
  wins integer not null default 0,
  stats jsonb not null default '{}'::jsonb,  -- pro Spiel: { quiz: { games, wins, points }, … }
  achievements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jedes Spiel wird pro Profil nur einmal gezählt
create table if not exists public.profile_games (
  profile_id text not null references public.profiles(id) on delete cascade,
  game_key text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_key)
);

alter table public.profiles enable row level security;
alter table public.profile_games enable row level security;

-- Ergebnis eintragen. Gibt das aktualisierte Profil zurück (oder nichts, wenn schon gezählt).
create or replace function public.profile_add_result(p_id text, p_key text, p_game text, p_points integer, p_win boolean)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_games (profile_id, game_key) values (p_id, p_key) on conflict do nothing;
  if not found then return; end if;
  return query
  update public.profiles p
     set points = p.points + greatest(0, p_points),
         games = p.games + 1,
         wins = p.wins + case when p_win then 1 else 0 end,
         stats = jsonb_set(p.stats, array[p_game], jsonb_build_object(
           'games', coalesce((p.stats -> p_game ->> 'games')::int, 0) + 1,
           'wins', coalesce((p.stats -> p_game ->> 'wins')::int, 0) + case when p_win then 1 else 0 end,
           'points', coalesce((p.stats -> p_game ->> 'points')::int, 0) + greatest(0, p_points)
         ), true),
         updated_at = now()
   where p.id = p_id
  returning p.*;
end;
$$;

revoke execute on function public.profile_add_result(text, text, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.profile_add_result(text, text, text, integer, boolean) to service_role;
