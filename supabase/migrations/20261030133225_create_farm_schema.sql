-- X_Farm's first persistent schema. Every public table has RLS and explicit
-- authenticated-role grants; row access is constrained to the owning user.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index farms_owner_id_idx on public.farms (owner_id);

create table public.growing_zones (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  environment_type text not null default 'greenhouse'
    check (environment_type in ('indoor', 'outdoor', 'greenhouse', 'polytunnel', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, farm_id)
);

create index growing_zones_farm_id_idx on public.growing_zones (farm_id);

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  local_id text not null check (char_length(local_id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 60),
  species text not null check (char_length(species) between 1 and 100),
  variety text not null default '' check (char_length(variety) <= 100),
  scientific_name text not null default '' check (char_length(scientific_name) <= 150),
  planted_on date,
  growth_stage text not null default 'seedling'
    check (growth_stage in ('seedling', 'vegetative', 'flowering', 'fruiting', 'harvest')),
  growth_progress numeric(5, 2) not null default 0 check (growth_progress between 0 and 100),
  irrigation_interval_hours smallint not null default 24 check (irrigation_interval_hours between 1 and 168),
  last_watered_at timestamptz not null default now(),
  preferred_conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(preferred_conditions) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, zone_id),
  unique (zone_id, local_id)
);

create index plants_zone_id_idx on public.plants (zone_id);

create table public.sensors (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  sensor_key text not null check (char_length(sensor_key) between 1 and 100),
  metric text not null check (char_length(metric) between 1 and 80),
  display_name text not null check (char_length(display_name) between 1 and 100),
  unit text not null check (char_length(unit) between 1 and 32),
  source text not null default 'virtual' check (source in ('virtual', 'hardware')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, zone_id),
  unique (zone_id, sensor_key)
);

create index sensors_zone_id_idx on public.sensors (zone_id);

create table public.sensor_readings (
  id bigint generated always as identity primary key,
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  reading_key text not null check (char_length(reading_key) between 1 and 300),
  sensor_id uuid not null,
  plant_id uuid,
  value double precision not null check (value > '-Infinity'::float8 and value < 'Infinity'::float8),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (sensor_id, zone_id) references public.sensors (id, zone_id) on delete cascade,
  foreign key (plant_id, zone_id) references public.plants (id, zone_id) on delete cascade,
  unique (zone_id, reading_key)
);

create index sensor_readings_zone_time_idx on public.sensor_readings (zone_id, recorded_at desc);
create index sensor_readings_sensor_time_idx on public.sensor_readings (sensor_id, recorded_at desc);
create index sensor_readings_plant_time_idx on public.sensor_readings (plant_id, recorded_at desc) where plant_id is not null;

create table public.simulation_scenarios (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulation_scenarios_zone_id_idx on public.simulation_scenarios (zone_id);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  rule_type text not null check (rule_type in ('irrigation', 'ventilation', 'lighting')),
  enabled boolean not null default true,
  threshold numeric not null,
  unit text not null check (char_length(unit) between 1 and 32),
  action_configuration jsonb not null default '{}'::jsonb
    check (jsonb_typeof(action_configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, zone_id),
  unique (zone_id, rule_type)
);

create index automation_rules_zone_id_idx on public.automation_rules (zone_id);

create table public.automation_events (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  rule_id uuid,
  action text not null check (char_length(action) between 1 and 120),
  source text not null check (source in ('manual', 'automatic')),
  outcome jsonb not null default '{}'::jsonb check (jsonb_typeof(outcome) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (rule_id, zone_id) references public.automation_rules (id, zone_id) on delete set null (rule_id)
);

create index automation_events_zone_time_idx on public.automation_events (zone_id, occurred_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.growing_zones (id) on delete cascade,
  plant_id uuid,
  title text not null check (char_length(title) between 1 and 160),
  detail text not null default '',
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  raised_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (plant_id, zone_id) references public.plants (id, zone_id) on delete cascade,
  check ((status = 'resolved') = (resolved_at is not null))
);

create index alerts_zone_status_time_idx on public.alerts (zone_id, status, raised_at desc);

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.growing_zones enable row level security;
alter table public.plants enable row level security;
alter table public.sensors enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.simulation_scenarios enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_events enable row level security;
alter table public.alerts enable row level security;

create policy "Users manage their own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users manage their own farms" on public.farms
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Users manage zones in their farms" on public.growing_zones
  for all to authenticated
  using (exists (
    select 1 from public.farms f
    where f.id = growing_zones.farm_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.farms f
    where f.id = growing_zones.farm_id and f.owner_id = (select auth.uid())
  ));

create policy "Users manage plants in their zones" on public.plants
  for all to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = plants.zone_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = plants.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users manage sensors in their zones" on public.sensors
  for all to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = sensors.zone_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = sensors.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users read sensor data in their zones" on public.sensor_readings
  for select to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = sensor_readings.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users add sensor data to their zones" on public.sensor_readings
  for insert to authenticated
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = sensor_readings.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users manage scenarios in their zones" on public.simulation_scenarios
  for all to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = simulation_scenarios.zone_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = simulation_scenarios.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users manage rules in their zones" on public.automation_rules
  for all to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = automation_rules.zone_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = automation_rules.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users read automation events in their zones" on public.automation_events
  for select to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = automation_events.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users record automation events in their zones" on public.automation_events
  for insert to authenticated
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = automation_events.zone_id and f.owner_id = (select auth.uid())
  ));

create policy "Users manage alerts in their zones" on public.alerts
  for all to authenticated
  using (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = alerts.zone_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.growing_zones z
    join public.farms f on f.id = z.farm_id
    where z.id = alerts.zone_id and f.owner_id = (select auth.uid())
  ));

-- New Supabase projects do not expose new public tables to the Data API by
-- default. These grants expose only the authenticated role; RLS scopes rows.
revoke all on public.profiles, public.farms, public.growing_zones, public.plants,
  public.sensors, public.sensor_readings, public.simulation_scenarios,
  public.automation_rules, public.automation_events, public.alerts from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.farms to authenticated;
grant select, insert, update, delete on public.growing_zones to authenticated;
grant select, insert, update, delete on public.plants to authenticated;
grant select, insert, update, delete on public.sensors to authenticated;
grant select, insert on public.sensor_readings to authenticated;
grant usage, select on sequence public.sensor_readings_id_seq to authenticated;
grant select, insert, update, delete on public.simulation_scenarios to authenticated;
grant select, insert, update, delete on public.automation_rules to authenticated;
grant select, insert on public.automation_events to authenticated;
grant select, insert, update on public.alerts to authenticated;
