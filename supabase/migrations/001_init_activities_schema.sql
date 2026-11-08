-- Amanda's Study Planner — schema inicial de atividades
create extension if not exists pgcrypto;

create or replace function public.update_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null check (length(trim(name)) > 0),
  code varchar(50),
  color varchar(20),
  professor varchar(150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type varchar(20) not null check (type in ('TASK', 'EXAM', 'ASSIGNMENT')),
  title varchar(200) not null check (length(trim(title)) > 0),
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key references public.activities(id) on delete cascade,
  due_date date,
  due_time time,
  priority varchar(10) not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  status varchar(20) not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'COMPLETED')),
  estimated_time_minutes integer check (estimated_time_minutes >= 0 and estimated_time_minutes <= 999),
  tags text[] not null default array[]::text[]
);

create table if not exists public.exams (
  id uuid primary key references public.activities(id) on delete cascade,
  date date not null,
  time time,
  exam_type varchar(20) not null check (exam_type in ('WRITTEN', 'ORAL', 'PRACTICAL')),
  content text[] not null default array[]::text[],
  location varchar(100),
  notes text check (length(notes) <= 1000)
);

create table if not exists public.assignments (
  id uuid primary key references public.activities(id) on delete cascade,
  due_date date not null,
  due_time time,
  assignment_type varchar(20) not null check (assignment_type in ('WRITTEN', 'PRESENTATION', 'PROJECT')),
  criteria text check (length(criteria) <= 2000),
  status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'SUBMITTED', 'GRADED')),
  submitted_at timestamptz,
  graded_at timestamptz
);

create table if not exists public.activity_reminders (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type varchar(30) not null check (reminder_type in (
    'ON_DAY', 'ONE_HOUR_BEFORE', 'TWO_HOURS_BEFORE', 'THREE_HOURS_BEFORE',
    'ONE_DAY_BEFORE', 'TWO_DAYS_BEFORE', 'CUSTOM'
  )),
  reminder_offset_minutes integer not null default 0 check (reminder_offset_minutes >= 0 and reminder_offset_minutes <= 43200),
  reminder_time time not null,
  reminder_timestamp timestamptz not null,
  is_active boolean not null default true,
  was_fired boolean not null default false,
  fired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subjects_user on public.subjects(user_id);
create index if not exists idx_activities_user_created on public.activities(user_id, created_at desc);
create index if not exists idx_activities_user_subject on public.activities(user_id, subject_id);
create index if not exists idx_activities_user_type on public.activities(user_id, type);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_reminders_user on public.activity_reminders(user_id);
create index if not exists idx_reminders_activity on public.activity_reminders(activity_id);
create index if not exists idx_reminders_timestamp on public.activity_reminders(reminder_timestamp);
create index if not exists idx_reminders_pending on public.activity_reminders(reminder_timestamp)
  where is_active = true and was_fired = false;

drop trigger if exists trg_subjects_updated on public.subjects;
create trigger trg_subjects_updated before update on public.subjects
  for each row execute function public.update_timestamp();

drop trigger if exists trg_activities_updated on public.activities;
create trigger trg_activities_updated before update on public.activities
  for each row execute function public.update_timestamp();

drop trigger if exists trg_reminders_updated on public.activity_reminders;
create trigger trg_reminders_updated before update on public.activity_reminders
  for each row execute function public.update_timestamp();

alter table public.subjects enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.exams enable row level security;
alter table public.assignments enable row level security;
alter table public.activity_reminders enable row level security;

drop policy if exists "Subjects are owned by user" on public.subjects;
create policy "Subjects are owned by user" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Activities are owned by user" on public.activities;
create policy "Activities are owned by user" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Tasks follow activity ownership" on public.tasks;
create policy "Tasks follow activity ownership" on public.tasks
  for all using (exists (select 1 from public.activities a where a.id = tasks.id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.activities a where a.id = tasks.id and a.user_id = auth.uid()));

drop policy if exists "Exams follow activity ownership" on public.exams;
create policy "Exams follow activity ownership" on public.exams
  for all using (exists (select 1 from public.activities a where a.id = exams.id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.activities a where a.id = exams.id and a.user_id = auth.uid()));

drop policy if exists "Assignments follow activity ownership" on public.assignments;
create policy "Assignments follow activity ownership" on public.assignments
  for all using (exists (select 1 from public.activities a where a.id = assignments.id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.activities a where a.id = assignments.id and a.user_id = auth.uid()));

drop policy if exists "Reminders are owned by user" on public.activity_reminders;
create policy "Reminders are owned by user" on public.activity_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
