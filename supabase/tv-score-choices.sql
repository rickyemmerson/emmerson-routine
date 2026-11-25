begin;

-- Extend the existing read-only TV projection with the exact recorded choice
-- and the public choices for edited tasks. No wallet or history is published.


create or replace function routine_private.tv_job_overrides(source text) returns jsonb
language sql stable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(id, jsonb_build_object(
    'kind', case when job ->> 'kind' = 'tick' then 'tick' else 'score' end,
    'btns', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', opt ->> 'key', 'label', left(opt ->> 'label', 24), 'pts', (opt ->> 'pts')::int
      ) order by ordinal)
      from jsonb_array_elements(
        case when jsonb_typeof(job -> 'btns') = 'array' then job -> 'btns' else '[]'::jsonb end
      ) with ordinality as choice(opt, ordinal)
      where ordinal <= 5
        and opt ->> 'key' in ('no','failed','complete','yes','spotless','tidy','fast','u10','u15','over15','8pm','815','830','845','after845')
        and jsonb_typeof(opt -> 'label') = 'string'
        and opt ->> 'pts' ~ '^-?(100|[0-9]{1,2})$'
    ), '[]'::jsonb),
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

create or replace function routine_private.tv_board_with_jobs(source text, board_day date) returns jsonb
language sql stable set search_path = ''
as $$
  with state as (
    select source::jsonb #> array['routineV7','daily',board_day::text] as day,
           routine_private.tv_board(source, board_day) as legacy
  ),
  girls(girl) as (values ('abby'),('olivia'))
  select jsonb_object_agg(girl, jsonb_build_object(
    'points', legacy #> array[girl,'points'],
    'tasks', (legacy #> array[girl,'tasks']) || legacy_bonus.states || recorded.states,
    'choices', recorded.choices
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
      when score in ('no','failed','over15','after845') then 'missed' else 'done' end), '{}'::jsonb) as states,
           coalesce(jsonb_object_agg(id, score), '{}'::jsonb) as choices
    from jsonb_each(case when jsonb_typeof(day -> girl) = 'object' then day -> girl else '{}'::jsonb end) scores(id, entry)
    cross join lateral (select case when jsonb_typeof(entry) = 'string' then entry #>> '{}' else entry ->> 'score' end as score) selected
    where id ~ '^[a-z0-9_]{1,48}$'
      and score in ('no','failed','complete','yes','spotless','tidy','fast','u10','u15','over15','8pm','815','830','845','after845')
  ) recorded;
$$;
revoke execute on function routine_private.tv_job_overrides(text) from public, anon, authenticated;
revoke execute on function routine_private.tv_board_with_jobs(text,date) from public, anon, authenticated;

update public.routine_tv_catalogue
set jobs = routine_private.tv_job_overrides((select value from public.data where id = 1))
where singleton;

insert into public.routine_tv_today (singleton, day, board)
select true, today, routine_private.tv_board_with_jobs(value, today)
from public.data cross join lateral (select (now() at time zone 'Australia/Brisbane')::date as today) brisbane
where id = 1 and value is not null
on conflict (singleton) do update set day = excluded.day, board = excluded.board;

commit;
