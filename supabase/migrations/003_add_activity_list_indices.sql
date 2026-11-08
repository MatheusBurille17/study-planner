-- Índices para listagem, filtros, busca e calendário
create index if not exists idx_activities_user_created_desc
  on public.activities(user_id, created_at desc);

create index if not exists idx_tasks_due_date
  on public.tasks(due_date);

create index if not exists idx_exams_date
  on public.exams(date);

create index if not exists idx_assignments_due_date
  on public.assignments(due_date);

create index if not exists idx_activities_user_subject_created
  on public.activities(user_id, subject_id, created_at desc);

-- Full-text search em português para título e descrição
create index if not exists idx_activities_search
  on public.activities
  using gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Índices de calendário (tipo + data)
create index if not exists idx_activities_type_created
  on public.activities(user_id, type, created_at);
