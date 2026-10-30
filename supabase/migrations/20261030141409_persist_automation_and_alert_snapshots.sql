-- Add idempotency keys for client snapshots while keeping legacy rows valid.
alter table public.simulation_scenarios
  add column snapshot_key text
    check (snapshot_key is null or char_length(snapshot_key) between 1 and 100);
alter table public.simulation_scenarios
  add constraint simulation_scenarios_zone_snapshot_key_unique
  unique (zone_id, snapshot_key);

alter table public.automation_events
  add column client_event_id text
    check (client_event_id is null or char_length(client_event_id) between 1 and 120);
alter table public.automation_events
  add constraint automation_events_zone_client_event_unique
  unique (zone_id, client_event_id);

alter table public.alerts
  add column alert_key text
    check (alert_key is null or char_length(alert_key) between 1 and 120);
alter table public.alerts
  add constraint alerts_zone_alert_key_unique
  unique (zone_id, alert_key);
