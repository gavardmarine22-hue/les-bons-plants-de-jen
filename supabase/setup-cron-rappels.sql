-- Active l'extension pg_cron (une seule fois)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime l'ancien job s'il existe déjà
select cron.unschedule('send-reminder-emails')
where exists (
  select 1 from cron.job where jobname = 'send-reminder-emails'
);

-- Crée le job : tous les jours à 7h00 UTC (= 9h heure française en été)
select cron.schedule(
  'send-reminder-emails',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://bgodiiegxxlemofkfcsc.supabase.co/functions/v1/send-reminder-emails',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
