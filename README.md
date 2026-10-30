# X_Farm

X_Farm is a software-only agricultural monitoring MVP. The first release uses virtual plants and simulated environmental readings; no sensors or live data services are required.

## Live application

Open the public app at <https://x-farm-007.vercel.app>.

## Local development

```sh
npm install
npm run dev
```

Open <http://localhost:3000>.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

See [`docs/architecture-and-plan.md`](docs/architecture-and-plan.md) for the current architecture, what V0.1 still needs, and the staged implementation plan. Project-specific instructions are in [`AGENTS.md`](AGENTS.md).
