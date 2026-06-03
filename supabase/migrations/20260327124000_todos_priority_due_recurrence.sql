-- Extend personal todos with planning fields.
alter table public.todos
  add column if not exists priority text not null default 'medium',
  add column if not exists due_at timestamptz null,
  add column if not exists recurrence text not null default 'none';

-- Constrain values so UI/filter logic can rely on known enums.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_priority_check'
  ) then
    alter table public.todos
      add constraint todos_priority_check
      check (priority in ('low', 'medium', 'high'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_recurrence_check'
  ) then
    alter table public.todos
      add constraint todos_recurrence_check
      check (recurrence in ('none', 'daily', 'weekly', 'monthly'));
  end if;
end
$$;
