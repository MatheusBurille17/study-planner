-- Agenda a Edge Function `send-reminders` a cada 5 minutos.
--
-- Idempotente: pode ser aplicada várias vezes sem criar jobs duplicados.
--
-- A URL do projeto e o CRON_SECRET não ficam no repositório. Depois de aplicar
-- a migration, configure o job de uma destas formas:
--
--   1) Chamando a função (mais simples):
--      select public.configure_send_reminders_cron(
--        'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
--        '<CRON_SECRET>'
--      );
--
--   2) Via Vault (o segredo não aparece no histórico do SQL Editor):
--      select vault.create_secret(
--        'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
--        'send_reminders_url'
--      );
--      select vault.create_secret('<CRON_SECRET>', 'send_reminders_secret');
--      -- Reaplique esta migration (ou rode o bloco DO abaixo) para agendar.
--
--   3) Via setting do banco:
--      alter database postgres set app.settings.send_reminders_url =
--        'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders';
--      alter database postgres set app.settings.send_reminders_secret = '<CRON_SECRET>';
--      -- Reconecte e reaplique esta migration.

create schema if not exists extensions;

do $$
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception
    when others then
      raise notice 'pg_cron não pôde ser habilitado automaticamente: %', sqlerrm;
  end;

  begin
    execute 'create extension if not exists pg_net with schema extensions';
  exception
    when others then
      raise notice 'pg_net não pôde ser habilitado automaticamente: %', sqlerrm;
  end;
end;
$$;

-- Agenda (ou reagenda) o job, removendo execuções antigas com o mesmo nome.
create or replace function public.configure_send_reminders_cron(
  p_function_url text,
  p_cron_secret text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_headers jsonb;
  v_command text;
  v_job_id bigint;
begin
  if p_function_url is null or btrim(p_function_url) = '' then
    raise exception 'Informe a URL da Edge Function send-reminders';
  end if;

  if p_function_url !~* '^https?://' then
    raise exception 'URL inválida: %', p_function_url;
  end if;

  for v_existing in
    select jobid from cron.job where jobname = 'send-reminders'
  loop
    perform cron.unschedule(v_existing.jobid);
  end loop;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  if p_cron_secret is not null and btrim(p_cron_secret) <> '' then
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || p_cron_secret);
  end if;

  v_command := format(
    $sql$select net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$sql$,
    p_function_url,
    v_headers::text
  );

  v_job_id := cron.schedule('send-reminders', '*/5 * * * *', v_command);

  raise notice 'Job send-reminders agendado (jobid %).', v_job_id;
  return v_job_id;
end;
$$;

comment on function public.configure_send_reminders_cron(text, text) is
  'Cria/reagenda o job de CRON que chama a Edge Function send-reminders.';

-- Remove o job (idempotente).
create or replace function public.remove_send_reminders_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
begin
  for v_existing in
    select jobid from cron.job where jobname = 'send-reminders'
  loop
    perform cron.unschedule(v_existing.jobid);
  end loop;

  raise notice 'Job send-reminders removido (se existia).';
end;
$$;

comment on function public.remove_send_reminders_cron() is
  'Remove o job de CRON da Edge Function send-reminders.';

-- Essas funções só devem ser executadas pelo dono/service role.
revoke all on function public.configure_send_reminders_cron(text, text) from public;
revoke all on function public.remove_send_reminders_cron() from public;
revoke all on function public.configure_send_reminders_cron(text, text) from anon, authenticated;
revoke all on function public.remove_send_reminders_cron() from anon, authenticated;
grant execute on function public.configure_send_reminders_cron(text, text) to service_role;
grant execute on function public.remove_send_reminders_cron() to service_role;

-- Tenta agendar automaticamente se a URL já estiver configurada via Vault ou
-- via `app.settings.send_reminders_url`. Caso contrário, apenas avisa.
do $$
declare
  v_url text;
  v_secret text;
begin
  begin
    v_url := current_setting('app.settings.send_reminders_url', true);
    v_secret := current_setting('app.settings.send_reminders_secret', true);
  exception
    when others then
      v_url := null;
      v_secret := null;
  end;

  if v_url is null or btrim(v_url) = '' then
    begin
      select decrypted_secret
        into v_url
        from vault.decrypted_secrets
       where name = 'send_reminders_url'
       limit 1;
    exception
      when others then
        v_url := null;
    end;
  end if;

  if v_secret is null or btrim(v_secret) = '' then
    begin
      select decrypted_secret
        into v_secret
        from vault.decrypted_secrets
       where name = 'send_reminders_secret'
       limit 1;
    exception
      when others then
        v_secret := null;
    end;
  end if;

  if v_url is null or btrim(v_url) = '' then
    raise notice
      'CRON send-reminders NÃO configurado. Rode: select public.configure_send_reminders_cron(''https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders'', ''<CRON_SECRET>'');';
  else
    perform public.configure_send_reminders_cron(v_url, v_secret);
  end if;
end;
$$;
