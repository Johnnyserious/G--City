-- G City: Münzen, Joker-Tasche und Käufe.
-- Einmal komplett im Supabase SQL Editor ausführen (kann gefahrlos mehrmals laufen).

-- Münzstand pro Konto
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  last_daily date,
  created_at timestamptz not null default now()
);

-- Gekaufte Joker (Joker-Tasche)
create table if not exists public.inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null,
  qty integer not null default 0 check (qty >= 0),
  primary key (user_id, item)
);

-- Jede Buchung (Kauf, Bonus, Joker-Kauf, Joker-Einsatz). ref ist eindeutig → nichts wird doppelt gutgeschrieben.
create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref text unique,
  cents integer,
  created_at timestamptz not null default now()
);
create index if not exists coin_ledger_user on public.coin_ledger (user_id, created_at desc);

-- Nur der Server (Secret Key) darf an die Tabellen
alter table public.wallets enable row level security;
alter table public.inventory enable row level security;
alter table public.coin_ledger enable row level security;

-- Echtgeld-Kauf gutschreiben (Münzen + Joker). Doppelte ref → nichts passiert, gibt false zurück.
create or replace function public.shop_grant(p_user uuid, p_coins integer, p_items jsonb, p_reason text, p_ref text, p_cents integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare k text; v integer;
begin
  begin
    insert into coin_ledger (user_id, delta, reason, ref, cents) values (p_user, p_coins, p_reason, p_ref, p_cents);
  exception when unique_violation then
    return false;
  end;
  insert into wallets (user_id, coins) values (p_user, p_coins)
    on conflict (user_id) do update set coins = wallets.coins + excluded.coins;
  for k, v in select * from jsonb_each_text(coalesce(p_items, '{}'::jsonb)) loop
    insert into inventory (user_id, item, qty) values (p_user, k, v::integer)
      on conflict (user_id, item) do update set qty = inventory.qty + excluded.qty;
  end loop;
  return true;
end; $$;

-- Täglicher Bonus (einmal pro Kalendertag, deutsche Zeit)
create or replace function public.shop_daily(p_user uuid, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Berlin')::date; n integer;
begin
  insert into wallets (user_id) values (p_user) on conflict do nothing;
  update wallets set coins = coins + p_amount, last_daily = today
   where user_id = p_user and (last_daily is null or last_daily < today)
   returning coins into n;
  if n is null then return -1; end if;
  insert into coin_ledger (user_id, delta, reason) values (p_user, p_amount, 'daily');
  return n;
end; $$;

-- Joker mit Münzen kaufen
create or replace function public.shop_buy(p_user uuid, p_item text, p_price integer, p_qty integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update wallets set coins = coins - p_price * p_qty where user_id = p_user and coins >= p_price * p_qty returning coins into n;
  if n is null then return false; end if;
  insert into inventory (user_id, item, qty) values (p_user, p_item, p_qty)
    on conflict (user_id, item) do update set qty = inventory.qty + excluded.qty;
  insert into coin_ledger (user_id, delta, reason) values (p_user, -p_price * p_qty, 'buy:' || p_item);
  return true;
end; $$;

-- Joker im Spiel einsetzen (verbraucht 1 Stück)
create or replace function public.shop_use(p_user uuid, p_item text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update inventory set qty = qty - 1 where user_id = p_user and item = p_item and qty > 0 returning qty into n;
  if n is null then return false; end if;
  insert into coin_ledger (user_id, delta, reason) values (p_user, 0, 'use:' || p_item);
  return true;
end; $$;

revoke execute on function public.shop_grant(uuid, integer, jsonb, text, text, integer) from public, anon, authenticated;
revoke execute on function public.shop_daily(uuid, integer) from public, anon, authenticated;
revoke execute on function public.shop_buy(uuid, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.shop_use(uuid, text) from public, anon, authenticated;
grant execute on function public.shop_grant(uuid, integer, jsonb, text, text, integer) to service_role;
grant execute on function public.shop_daily(uuid, integer) to service_role;
grant execute on function public.shop_buy(uuid, text, integer, integer) to service_role;
grant execute on function public.shop_use(uuid, text) to service_role;
