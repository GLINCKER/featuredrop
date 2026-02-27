# Docs Site (Next.js + Nextra)

The docs and marketing site lives in `apps/docs`.

## Local commands

From repository root:

```bash
pnpm docs:install
pnpm docs:dev
pnpm docs:build
pnpm docs:start
```

The docs app is configured as a static export (`output: 'export'`), so it can be hosted on Vercel, Cloudflare Pages, or GitHub Pages.

## Route map

- `/` marketing landing
- `/docs` docs index
- `/docs/quickstart` fast onboarding path
- `/docs/examples` copy-paste examples
- `/docs/api` API map
- `/playground` sandbox launch links

## Local demo components

Docs pages can include in-repo interactive demos via React components under `apps/docs/components/demos`.

- Demo wrapper: `apps/docs/components/code-demo-card.tsx`
- Changelog demo: `apps/docs/components/demos/changelog-demo.tsx`

## Vercel setup

Recommended:

1. Import repository into Vercel
2. Set root directory to `apps/docs`
3. Build command: `pnpm build`
4. Install command: `pnpm install --frozen-lockfile`
5. Output directory: `.next` (default)

Use the Vercel project subdomain for validation first. Attach custom domain after traction.

## GitHub Pages setup

Workflow is included at `.github/workflows/docs-pages.yml`.

What it does:

1. Builds `apps/docs` as static export
2. Sets `NEXT_PUBLIC_BASE_PATH=/<repo-name>`
3. Uploads `apps/docs/out` and deploys to GitHub Pages

Result URL pattern:

- `https://<user>.github.io/<repo>/`

## Cloudflare Pages setup

Use `apps/docs` as the project root.

- Build command: `pnpm build`
- Output directory: `out`
- Environment variable (project deployments): `NEXT_PUBLIC_BASE_PATH` empty unless serving from a subpath
