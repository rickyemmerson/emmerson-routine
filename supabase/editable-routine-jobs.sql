begin;

create table public.routine_tv_catalogue (
  singleton boolean primary key default true check (singleton),
  jobs jsonb not null
);
alter table public.routine_tv_catalogue enable row level security;
revoke all on public.routine_tv_catalogue from public, anon, authenticated;
grant select on public.routine_tv_catalogue to anon, authenticated;
create policy read_tv_catalogue on public.routine_tv_catalogue
  for select to anon, authenticated using (singleton);

-- Keep the public task settings available after midnight, while the existing
-- today-only policy continues to hide yesterday's scores and completion marks.
create view public.routine_tv with (security_invoker = true) as
select live.day, live.board, catalogue.jobs
from public.routine_tv_catalogue catalogue
left join public.routine_tv_today live using (singleton);
revoke all on public.routine_tv from public, anon, authenticated;
grant select on public.routine_tv to anon, authenticated;

create function routine_private.tv_job_overrides(source text) returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(id, jsonb_build_object(
    'name', left(job ->> 'name', 48),
    'group', job ->> 'group',
    'due', case when job ->> 'due' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then job ->> 'due' else '' end,
    'assignment', job ->> 'assignment',
    'days', coalesce((
      select jsonb_agg(day) from jsonb_array_elements(
        case when jsonb_typeof(job -> 'days') = 'array' then job -> 'days' else '[]'::jsonb end
      ) day where day in ('0','1','2','3','4','5','6')
    ), '[]'::jsonb),
    'morningOnly', coalesce(job -> 'morningOnly' = 'true'::jsonb, false),
    'archived', coalesce(job -> 'archived' = 'true'::jsonb, false)
  )), '{}'::jsonb)
  from (select source::jsonb #> '{routineV7,settings,taskOverrides}' as jobs) settings
  cross join lateral jsonb_each(case when jsonb_typeof(jobs) = 'object' then jobs else '{}'::jsonb end) as job_entry(id, job)
  where id ~ '^[a-z0-9_]{1,48}$'
    and jsonb_typeof(job -> 'name') = 'string'
    and job ->> 'group' in ('morning', 'school', 'dinner', 'bonus')
    and job ->> 'assignment' in ('both', 'abby', 'olivia', 'dog', 'kitchen');
$$;

create function routine_private.tv_board_with_jobs(source text, board_day date) returns jsonb
language sql stable set search_path = ''
as $$
  with state as (
    select source::jsonb #> array['routineV7','daily',board_day::text] as day,
           routine_private.tv_board(source, board_day) as legacy
  ),
  girls(girl) as (values ('abby'),('olivia'))
  select jsonb_object_agg(girl, jsonb_build_object(
    'points', legacy #> array[girl,'points'],
    'tasks', (legacy #> array[girl,'tasks']) || legacy_bonus.states || recorded.states
  ))
  from state cross join girls
  cross join lateral (
    select coalesce(jsonb_object_agg(id, 'done'::text), '{}'::jsonb) as states
    from jsonb_each(
      case when jsonb_typeof(day #> array['bonus',girl]) = 'object' then day #> array['bonus',girl] else '{}'::jsonb end
      || case when jsonb_typeof(day #> array[girl,'bonus']) = 'object' then day #> array[girl,'bonus'] else '{}'::jsonb end
    ) bonuses(id, entry)
    where id ~ '^b_[a-z0-9_]{1,45}$' and (entry = 'true'::jsonb or entry ->> 'score' = 'complete')
  ) legacy_bonus
  cross join lateral (
    select coalesce(jsonb_object_agg(id, case
      when entry ->> 'score' in ('no','failed','over15','after845') then 'missed' else 'done' end), '{}'::jsonb) as states
    from jsonb_each(case when jsonb_typeof(day -> girl) = 'object' then day -> girl else '{}'::jsonb end) scores(id, entry)
    where id ~ '^[a-z0-9_]{1,48}$' and jsonb_typeof(entry -> 'award') = 'number'
      and entry ->> 'score' in ('no','failed','complete','yes','spotless','tidy','fast','u10','u15','over15','8pm','815','830','845','after845')
  ) recorded;
$$;
revoke execute on function routine_private.tv_job_overrides(text) from public, anon, authenticated;
revoke execute on function routine_private.tv_board_with_jobs(text,date) from public, anon, authenticated;

create or replace function routine_private.refresh_tv_board() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Brisbane')::date;
begin
  if new.id = 1 and new.value is not null then
    insert into public.routine_tv_today (singleton, day, board)
    values (true, today, routine_private.tv_board_with_jobs(new.value, today))
    on conflict (singleton) do update set day = excluded.day, board = excluded.board;

    insert into public.routine_tv_catalogue (singleton, jobs)
    values (true, routine_private.tv_job_overrides(new.value))
    on conflict (singleton) do update set jobs = excluded.jobs
    where routine_tv_catalogue.jobs is distinct from excluded.jobs;
  end if;
  return new;
end;
$$;

insert into public.routine_tv_catalogue (singleton, jobs)
select true, coalesce((select routine_private.tv_job_overrides(value) from public.data where id = 1), '{}'::jsonb);

insert into public.routine_tv_today (singleton, day, board)
select true, today, routine_private.tv_board_with_jobs(value, today)
from public.data cross join lateral (select (now() at time zone 'Australia/Brisbane')::date as today) brisbane
where id = 1 and value is not null
on conflict (singleton) do update set day = excluded.day, board = excluded.board;

commit;
