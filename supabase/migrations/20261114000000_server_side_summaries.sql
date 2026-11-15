-- Resúmenes que el servidor termina aunque el paciente cierre la página.
-- generate-summary-openai guarda el id de OpenAI en pending_summaries al iniciar el resumen,
-- y finish-summaries (llamada cada minuto por pg_cron) guarda los que ya terminaron.
create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.pending_summaries
  add column if not exists openai_response_id text,
  add column if not exists summary_started_at timestamptz,
  add column if not exists patient_dob date,
  add column if not exists patient_email text;

comment on column public.pending_summaries.openai_response_id is 'Resumen en curso en OpenAI; finish-summaries lo recoge si la página del paciente se cerró';

create index if not exists idx_pending_summaries_openai_processing
  on public.pending_summaries (summary_started_at)
  where status = 'processing' and openai_response_id is not null;

-- La tarea programada lee la URL del proyecto y la llave pública (anon) desde Vault.
-- Antes de esto deben existir los secretos 'project_url' y 'anon_key':
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<anon key>', 'anon_key');
select cron.schedule(
  'finish-summaries',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/finish-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
