# send-reminders (Supabase Edge Function)

Executa a cada 5 minutos via CRON e envia Web Push para lembretes vencendo.

## Variáveis de ambiente

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY` (ou `NEXT_PUBLIC_VAPID_PUBLIC_KEY`)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ex.: `mailto:amanda@example.com`)
- `CRON_SECRET` (opcional; se definido, exige `Authorization: Bearer <secret>`)

## Agendamento

No painel do Supabase, configure o Cron:

```sql
select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$select net.http_post(
    url := '<SUPABASE_URL>/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  )$$
);
```

Ou use `supabase/config.toml` e `supabase functions deploy send-reminders`.

## Execução manual

```bash
supabase functions invoke send-reminders --no-verify-jwt
```

## Resiliência

- 404/410 desativam a inscrição imediatamente.
- 5xx agendam retry em 5 minutos em `notification_delivery_log.next_retry_at`.
- Preferências e horário de silêncio são respeitados antes do envio.
- Falha de mais de 10% é visível nos logs para alerta.
