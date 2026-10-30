# X_Farm

X_Farm is a software-only agricultural monitoring MVP. The first release uses virtual plants and simulated environmental readings; no sensors or live data services are required.

## Local development

```sh
npm install
npm run dev
```

Open <http://localhost:3000>.

## Optional local Supabase

The dashboard works without Supabase and continues to use browser storage. To test account sign-in and snapshot sync locally:

1. Install and start Docker Desktop (required by the local Supabase stack).
2. Start the local services from the repository root:

   ```sh
   npx supabase start
   npx supabase db reset
   npx supabase status
   ```

   `db reset` applies the checked-in migrations to the local database and resets local data.
3. Copy `.env.example` to `.env.local`, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the local API URL and publishable key shown by `supabase status`.
4. Run `npm run dev` and open `/login`. Local email confirmation is disabled by the checked-in Supabase config.

Keep `.env.local` private. Only the public URL and publishable key belong in these `NEXT_PUBLIC_` variables; never put a service-role or secret key in browser-visible configuration. The optional account sync currently stores plant profiles and the latest sensor snapshot; automation settings/events and alerts remain in browser storage.

The checked-in migration has been applied and verified against the local Supabase stack in this development environment. No hosted Supabase project or live database has been changed.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

See [`docs/architecture-and-plan.md`](docs/architecture-and-plan.md) for the current architecture, what V0.1 still needs, and the staged implementation plan. Project-specific instructions are in [`AGENTS.md`](AGENTS.md).
