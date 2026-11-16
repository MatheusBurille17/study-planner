# send-reminders (Supabase Edge Function)

Executa a cada 5 minutos via CRON e envia Web Push para:

- **lembretes manuais** em `activity_reminders` (quando o usuário configura um ou mais);
- **lembretes padrão** de atividades sem lembrete manual: provas/trabalhos **24h antes** e tarefas **N horas antes** (preferência de 0 a 6h).

## Variáveis de ambiente

Configure nos **secrets** da Edge Function (`supabase secrets set ...`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY` (ou `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ex.: `mailto:amanda@example.com`)
- `CRON_SECRET` (opcional; se definido, exige `Authorization: Bearer <secret>`)
- `APP_TIME_ZONE` (opcional; padrão `America/Sao_Paulo`) — usado para horário de silêncio e para as datas sem hora

> A chave pública VAPID precisa ser **a mesma** usada no build do Next
> (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Se você trocar as chaves, todas as
> inscrições antigas deixam de funcionar e os usuários precisam reativar.

## Deploy

```bash
supabase functions deploy send-reminders --no-verify-jwt
```

> **Importante:** `--no-verify-jwt` é necessário quando o CRON chama a função
> com `Authorization: Bearer <CRON_SECRET>`. Sem essa flag o gateway do
> Supabase rejeita a chamada com 401 **antes** de executar o código — a função
> nunca roda e nenhum lembrete é enviado. A autenticação continua sendo feita
> pelo `CRON_SECRET` dentro da função.
>
> Alternativa: manter a verificação de JWT e enviar a `SUPABASE_SERVICE_ROLE_KEY`
> no header `Authorization` do CRON (em vez do `CRON_SECRET`).

## Agendamento

A migration `supabase/migrations/005_schedule_send_reminders_cron.sql` cria as
funções `configure_send_reminders_cron` e `remove_send_reminders_cron` e tenta
agendar o job automaticamente caso a URL esteja no Vault ou em
`app.settings.send_reminders_url`.

Depois do `supabase db push`, a forma mais simples de configurar é rodar uma vez
no SQL Editor:

```sql
select public.configure_send_reminders_cron(
  'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
  '<CRON_SECRET>'
);
```

O job fica agendado a cada 5 minutos (`*/5 * * * *`) e a função é idempotente:
chamar de novo apenas reagenda, sem duplicar.

Alternativa com **Vault** (o segredo não aparece no histórico do SQL Editor):

```sql
select vault.create_secret(
  'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
  'send_reminders_url'
);
select vault.create_secret('<CRON_SECRET>', 'send_reminders_secret');
```

Depois reaplique a migration (ou chame
`select public.configure_send_reminders_cron(...)` com os valores).

> O comando do job (incluindo o `Authorization`) fica salvo em
> `cron.job.command`, visível apenas para o role `postgres`. O Vault evita que
> o segredo apareça no histórico do SQL Editor, mas não no `cron.job`.

Também é possível configurar via setting do banco:

```sql
alter database postgres set app.settings.send_reminders_url =
  'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders';
alter database postgres set app.settings.send_reminders_secret = '<CRON_SECRET>';
```

Para remover o agendamento:

```sql
select public.remove_send_reminders_cron();
```

Se preferir criar o job manualmente, o SQL equivalente é:

```sql
select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$select net.http_post(
    url := '<SUPABASE_URL>/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := '{}'::jsonb
  )$$
);
```

As extensões `pg_cron` e `pg_net` são habilitadas pela migration. Se a criação
automática falhar, habilite em **Database → Extensions** no Dashboard.

## Diagnóstico

1. Verifique se o job existe e está ativo:
   ```sql
   select jobid, schedule, command, active from cron.job;
   ```
2. Veja as últimas execuções:
   ```sql
   select jobid, status, start_time, end_time, return_message
   from cron.job_run_details
   order by start_time desc
   limit 10;
   ```
3. Invoque manualmente e confira as estatísticas:
   ```bash
   curl -s -X POST \
     -H "Authorization: Bearer <CRON_SECRET>" \
     https://<SUPABASE_URL>/functions/v1/send-reminders
   ```
   Resposta esperada (exemplo):
   ```json
   {
     "ok": true,
     "processed": 3,
     "delivered": 3,
     "failed": 0,
     "skipped": 0,
     "explicit": { "...": "..." },
     "defaults": { "...": "..." },
     "timeZone": "America/Sao_Paulo"
   }
   ```
4. Se `processed` continuar 0, confira:
   - `is_deleted = false` nas atividades;
   - datas das atividades (a janela considera de 2 dias atrás a 2 dias à frente);
   - `notification_preferences.reminders_enabled` e o tipo específico;
   - horário de silêncio (`quiet_hours_start`/`quiet_hours_end`) — lembretes que
     vencem no silêncio são **adiados** para o fim dele;
   - se existe alguma inscrição `is_active = true` em `push_subscriptions`.

## Resiliência

- 404/410 desativam a inscrição imediatamente.
- 5xx agendam retry em 5 minutos em `notification_delivery_log.next_retry_at`.
- Preferências e horário de silêncio são respeitados antes do envio (no fuso `APP_TIME_ZONE`).
- Lembretes que vencem no silêncio são adiados em vez de descartados.
- Falha de mais de 10% é visível nos logs para alerta.
