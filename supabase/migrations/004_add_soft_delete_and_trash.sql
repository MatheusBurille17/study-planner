-- Soft delete e lixeira (30 dias)
alter table public.activities
  add column if not exists is_deleted boolean not null default false;
alter table public.activities
  add column if not exists deleted_at timestamptz;

create index if not exists idx_activities_user_deleted
  on public.activities(user_id, is_deleted, deleted_at desc);

create index if not exists idx_activities_user_updated
  on public.activities(user_id, updated_at desc);

-- Listagens normais escondem itens excluídos; a lixeira filtra is_deleted = true.
drop policy if exists "Activities are owned by user" on public.activities;
create policy "Activities are owned by user" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.delete_old_deleted_activities()
returns void
language sql
security definer
as $$
  delete from public.activities
  where is_deleted = true
    and deleted_at < now() - interval '30 days';
$$;

-- Execute diariamente via pg_cron:
-- select cron.schedule('cleanup-trash', '0 3 * * *', $$select public.delete_old_deleted_activities()$$);
