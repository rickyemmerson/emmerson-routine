begin;

alter table public.data add column sync_version bigint not null default 0;
alter table public.data add column versioned_sync boolean not null default false;
revoke truncate, references, trigger on public.data from public, anon, authenticated;

create schema if not exists routine_private;
revoke all on schema routine_private from public, anon, authenticated;

create function routine_private.advance_sync_version() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.versioned_sync and current_user in ('anon', 'authenticated')
    and new.sync_version <> old.sync_version + 1 then
    raise exception 'Reload the app before saving changes';
  end if;
  new.versioned_sync := old.versioned_sync or new.sync_version = old.sync_version + 1;
  new.sync_version := old.sync_version + 1;
  return new;
end;
$$;

create trigger advance_routine_sync_version before update on public.data
for each row execute function routine_private.advance_sync_version();

create table public.routine_tv_today (
  singleton boolean primary key default true check (singleton),
  day date not null,
  board jsonb not null
);
alter table public.routine_tv_today enable row level security;
revoke all on public.routine_tv_today from public, anon, authenticated;
grant select on public.routine_tv_today to anon, authenticated;
create policy read_today_board on public.routine_tv_today for select to anon, authenticated
using (day = (now() at time zone 'Australia/Brisbane')::date);

-- This projection only returns enumerated task states and the current day's
-- routine points. Wallet balances, PINs and historical entries stay private.
create function routine_private.tv_board(value text, board_day date) returns jsonb
language sql stable set search_path = ''
as $$
  with source as (select value::jsonb -> 'routineV7' as routine),
  tasks(task_id, choices) as (values
    ('m_breakfast', array['yes', 'no']),
    ('m_teeth', array['yes', 'reminded', 'no']),
    ('m_dogfed', array['yes', 'reminded', 'no']),
    ('m_bed', array['yes', 'reminded', 'no']),
    ('as_homework', array['yes', 'no']),
    ('as_music', array['yes', 'no']),
    ('as_bedroom', array['spotless', 'tidy', 'no']),
    ('as_dogwalk', array['yes', 'reminded', 'no']),
    ('as_poopatrol', array['yes', 'reminded', 'no']),
    ('as_dogfed', array['yes', 'reminded', 'no']),
    ('as_washing', array['yes', 'reminded', 'no']),
    ('ad_lunch', array['yes', 'reminded', 'no']),
    ('ad_kitchen', array['spotless', 'tidy', 'no']),
    ('ad_shower', array['fast', 'u10', 'u15', 'over15']),
    ('ad_clothes', array['yes', 'reminded', 'no']),
    ('ad_bag', array['yes', 'reminded', 'no']),
    ('ad_teeth', array['yes', 'reminded', 'no']),
    ('ad_bed', array['8pm', '815', '830', '845', 'after845'])
  ),
  girls(girl) as (values ('abby'), ('olivia'))
  select jsonb_object_agg(girl, jsonb_build_object(
    'tasks', coalesce((
      select jsonb_object_agg(task_id, case when score in ('no', 'over15', 'after845') then 'missed' else 'done' end)
      from tasks
      cross join lateral (select routine #> array['daily', board_day::text, girl, task_id] as record) as task
      cross join lateral (select case when jsonb_typeof(record) = 'string' then record #>> '{}' else record ->> 'score' end as score) as selection
      where score = any(choices)
    ), '{}'::jsonb),
    'points', coalesce((
      select case when jsonb_typeof(entry -> 'points') = 'number' then entry -> 'points' end
      from jsonb_array_elements(case when jsonb_typeof(routine #> array['wallets', girl, 'ledger']) = 'array'
        then routine #> array['wallets', girl, 'ledger'] else '[]'::jsonb end) as entry
      where entry ->> 'reference' = 'routine:' || board_day::text
      limit 1
    ), '0'::jsonb)
  )) from source cross join girls;
$$;

create function routine_private.refresh_tv_board() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Brisbane')::date;
begin
  if new.id = 1 and new.value is not null then
    insert into public.routine_tv_today (singleton, day, board)
    values (true, today, routine_private.tv_board(new.value, today))
    on conflict (singleton) do update set day = excluded.day, board = excluded.board;
  end if;
  return new;
end;
$$;
revoke execute on function routine_private.refresh_tv_board() from public, anon, authenticated;
revoke execute on function routine_private.tv_board(text, date) from public, anon, authenticated;
revoke execute on function routine_private.advance_sync_version() from public, anon, authenticated;

create trigger refresh_routine_tv after insert or update of value on public.data
for each row execute function routine_private.refresh_tv_board();

insert into public.routine_tv_today (singleton, day, board)
select true, today, routine_private.tv_board(value, today)
from public.data cross join lateral (select (now() at time zone 'Australia/Brisbane')::date as today) brisbane
where id = 1 and value is not null;

commit;
