# X_Farm

X_Farm is a software-only agricultural monitoring MVP. The first release uses virtual plants and simulated environmental readings; no sensors or live data services are required.

## Live application

Open the public app at <https://x-farm-007.vercel.app>. The source for the deployed app is on [`feature/phase-3-supabase`](https://github.com/fanebmb-upb/X-Farm_007/tree/feature/phase-3-supabase). Vercel hosts the site because the Next.js app includes server API routes that GitHub Pages cannot run.

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

Keep `.env.local` private. Only the public URL and publishable key belong in these `NEXT_PUBLIC_` variables; never put a service-role or secret key in browser-visible configuration. The optional account sync stores plant profiles, the latest sensor snapshot, automation settings and rules, automation event history, and active alerts.

The checked-in migration has been applied and verified against the local Supabase stack in this development environment. No hosted Supabase project or live database has been changed.

The Weather section uses Open-Meteo's no-key API for evaluation, with attribution in the interface. Its free API is limited to non-commercial use; a commercial product must use an appropriately licensed endpoint. Weather forecasts remain advisory and never change simulated sensor values or trigger automation.

The AI Assistant uses the OpenAI Responses API from a server route. To enable it, set `OPENAI_API_KEY` in the server environment (and optionally `OPENAI_MODEL`; defaults to `gpt-6-luna`) and restart the app. Never add the key to a `NEXT_PUBLIC_` variable. Each request sends the user's question, the last five conversation turns, and a bounded snapshot of simulated plants, readings, alerts, and automation events. Conversations are kept in browser memory only; responses are requested with provider storage disabled. OpenAI API usage may incur charges on the configured account. Recommendations are advisory and cannot execute automation.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

See [`docs/architecture-and-plan.md`](docs/architecture-and-plan.md) for the current architecture, what V0.1 still needs, and the staged implementation plan. Project-specific instructions are in [`AGENTS.md`](AGENTS.md).
