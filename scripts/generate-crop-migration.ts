// Regenerates the crop seed migration from lib/crops.ts so the database and the
// bundled copy stay identical. Run with: node scripts/generate-crop-migration.ts
import { writeFileSync } from "node:fs";
import { cropCatalog, cropIds, ECOCROP_SOURCE } from "../lib/crops.ts";

export const CROP_MIGRATION = "supabase/migrations/20261112120000_crop_profiles.sql";

function literal(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildCropMigration() {
  const rows = cropIds.map((id) => `  (${literal(id)}, ${literal(JSON.stringify(cropCatalog[id]))}::jsonb, ${cropCatalog[id].ecocrop ? literal(ECOCROP_SOURCE) : "null"})`);
  return `-- Crop knowledge base shared by every X_Farm user. Generated from lib/crops.ts
-- by scripts/generate-crop-migration.ts; edit the source file, not this one.
create table if not exists public.crop_profiles (
  id text primary key check (id ~ '^[a-z][a-z-]{1,40}$'),
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  source text,
  updated_at timestamptz not null default now()
);

alter table public.crop_profiles enable row level security;

drop policy if exists "Anyone can read crop profiles" on public.crop_profiles;
create policy "Anyone can read crop profiles" on public.crop_profiles
  for select to anon, authenticated
  using (true);

-- Read-only for app users; only migrations change the catalogue.
revoke all on public.crop_profiles from anon, authenticated, public;
grant usage on schema public to anon, authenticated;
grant select on public.crop_profiles to anon, authenticated;

insert into public.crop_profiles (id, profile, source) values
${rows.join(",\n")}
on conflict (id) do update set profile = excluded.profile, source = excluded.source, updated_at = now();

-- Defence in depth: reject markup characters in user-entered plant text.
-- "not valid" applies the rule to new and changed rows without failing on old ones.
alter table public.plants drop constraint if exists plants_text_safe;
alter table public.plants add constraint plants_text_safe
  check (name !~ '[<>{}\\[\\]"\`;=\\\\]' and variety !~ '[<>{}\\[\\]"\`;=\\\\]' and scientific_name !~ '[<>{}\\[\\]"\`;=\\\\]') not valid;
alter table public.farms drop constraint if exists farms_name_safe;
alter table public.farms add constraint farms_name_safe check (name !~ '[<>{}\\[\\]"\`;=\\\\]') not valid;
`;
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("generate-crop-migration.ts")) {
  writeFileSync(CROP_MIGRATION, buildCropMigration());
  console.log(`Wrote ${CROP_MIGRATION}`);
}
