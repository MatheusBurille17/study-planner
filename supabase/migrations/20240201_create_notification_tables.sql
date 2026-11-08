-- Notificações: inscrições push, preferências, logs, entregas e cliques
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  is_active boolean not null default true,
  device_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  reminders_enabled boolean not null default true,
  exams_enabled boolean not null default true,
  assignments_enabled boolean not null default true,
  tasks_enabled boolean not null default true,
  task_reminders_hours integer not null default 3 check (task_reminders_hours between 0 and 6),
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  sound_enabled boolean not null default true,
  vibration_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  activity_type varchar(20) check (activity_type in ('exam', 'assignment', 'task')),
  title varchar(200) not null,
  body text not null,
  sent_at timestamptz not null default now(),
  status varchar(20) not null default 'retrying' check (status in ('success', 'failed', 'retrying')),
  error text,
  device_info text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notification_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete cascade,
  attempt integer not null default 1,
  status varchar(20) not null default 'pending' check (status in ('pending', 'success', 'failed')),
  error_code integer,
  error_message text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_clicks (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notification_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_active on public.push_subscriptions(user_id, is_active);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);
create index if not exists idx_notification_preferences_user on public.notification_preferences(user_id);
create index if not exists idx_notification_logs_user_sent on public.notification_logs(user_id, sent_at desc);
create index if not exists idx_notification_delivery_retry on public.notification_delivery_log(next_retry_at);
create index if not exists idx_notification_clicks_user_clicked on public.notification_clicks(user_id, clicked_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_logs enable row level security;
alter table public.notification_delivery_log enable row level security;
alter table public.notification_clicks enable row level security;

drop policy if exists "Users manage own subscriptions" on public.push_subscriptions;
create policy "Users manage own subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own preferences" on public.notification_preferences;
create policy "Users manage own preferences" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Logs: usuário pode criar/ver os próprios; service role acessa tudo.
drop policy if exists "Users read own notification logs" on public.notification_logs;
create policy "Users read own notification logs" on public.notification_logs
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own notification logs" on public.notification_logs;
create policy "Users insert own notification logs" on public.notification_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users manage own delivery logs" on public.notification_delivery_log;
create policy "Users manage own delivery logs" on public.notification_delivery_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own clicks" on public.notification_clicks;
create policy "Users manage own clicks" on public.notification_clicks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated before update on public.push_subscriptions
  for each row execute function public.update_timestamp();

drop trigger if exists trg_notification_preferences_updated on public.notification_preferences;
create trigger trg_notification_preferences_updated before update on public.notification_preferences
  for each row execute function public.update_timestamp();
