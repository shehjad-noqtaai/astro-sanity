# astro-sanity — `@sanity/astro` pain-point repro

Minimal Astro project reproducing two real-world complaints about the official
[`@sanity/astro`](https://github.com/sanity-io/sanity-astro) integration, and
(on the fix branch / PR) the recommended workarounds. See [PRD.md](./PRD.md)
for full context, [docs/short-response.md](./docs/short-response.md) for the
one-page verdicts, and [docs/detailed-response.md](./docs/detailed-response.md)
for the full investigation (also live as editable content at `/faq`).

## The two problems (this branch — `main`)

1. **Visual editing requires React.** `src/layouts/Layout.astro` renders
   `<VisualEditing/>` from `@sanity/astro/visual-editing`, which is a React
   component — so `package.json` carries `@astrojs/react`, `react`, and
   `react-dom` in a project that otherwise uses no React.
2. **The integration forces its own client.** `astro.config.mjs` config
   produces the integration-owned client (`sanity:client` virtual module;
   older versions used `globalThis.sanityClient`). Our "central wrapped
   client" in `src/lib/custom-client.ts` is a second, independently configured
   client — `src/pages/index.astro` uses both, and the two configs must be
   kept in sync by hand.

## The fix (branch `fix/react-free-single-client`)

- Vanilla `enableVisualEditing()` from `@sanity/visual-editing` in a plain
  `<script>` — React, react-dom, and `@astrojs/react` removed from
  `package.json`.
- One client: `src/lib/sanity.ts` derives the wrapped client from
  `sanity:client` via `withConfig()`, so `astro.config.mjs` is the single
  source of config.

**Alternative for Svelte shops:** instead of the vanilla script, mount the
first-party Svelte component as an island — no React integration needed:

```astro
<LiveVisualEditing client:only="svelte" />
```

```svelte
<!-- LiveVisualEditing.svelte -->
<script>
  import { VisualEditing } from '@sanity/visual-editing/svelte'
</script>
<VisualEditing />
```

**Known wart:** `react`/`react-dom`/`styled-components` are non-optional peer
dependencies of `@sanity/visual-editing`, so npm still places React in
`node_modules` — but none of it ships in the production bundle (the overlay
renderer is lazy-loaded only during preview sessions).

## Full demo (branch `feat/full-demo`) — test the whole experience

This branch is backed by a **real Sanity project** (`im07utyl`, org `shehjad`,
dataset `production`) with seeded content, a Studio with the Presentation
tool, and a server-rendered frontend (posts list, post detail with Portable
Text and images). The Astro app stays React-free; the Studio is a separate
workspace in `studio/` (the Studio itself is a React app, but none of it
touches the frontend's dependency tree).

### 1. One-time setup

```sh
npm install
(cd studio && npm install)
cp .env.example .env
# then paste a Viewer token into SANITY_API_READ_TOKEN in .env
# (create at https://sanity.io/manage/project/im07utyl/api)
```

### 2. Run both apps

```sh
npm run dev                # Astro on :4321 — one server for BOTH audiences
(cd studio && npm run dev) # Studio on :3333
```

### 3. Test visual editing

Open http://localhost:3333, log in, and switch to the **Presentation** tab.
Preview mode is decided **per request**: Presentation opens the iframe
through `/api/preview/enable` with a signed secret
(`@sanity/preview-url-secret`); the Astro app validates it server-side and
sets an unforgeable (HMAC) preview cookie. That visitor gets drafts + stega +
click-to-edit overlays and a "Preview mode" banner with an exit link
(`/api/preview/disable`). Everyone else — same server, same URL — gets
published CDN content with zero visual-editing code in the HTML.

This mirrors `next-sanity`'s draft mode, hand-rolled for Astro in ~80 lines:
`src/middleware.ts`, `src/pages/api/preview/{enable,disable}.ts`, and a
per-request client switch in `src/lib/sanity.ts`. No env flag, no second
server mode; the site is deployable as-is without ever exposing drafts.

> Production note: when the Studio and site run on different domains over
> HTTPS, set the preview cookie with `sameSite: 'none', secure: true`
> (see the comment in `enable.ts`).

## Deploying

The adapter is **Vercel** (`@astrojs/vercel`): connect the repo, set
`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`,
`PUBLIC_SANITY_STUDIO_URL` (the deployed Studio URL) and
`SANITY_API_READ_TOKEN` in the project settings, and deploy. Portability
properties baked into the code:

- **Runtime secrets** — the token is declared via `astro:env`
  (`context: 'server', access: 'secret'`), so it's read from the running
  environment, not inlined at build. Builds without the token still work.
- **Web Crypto HMAC** — the preview cookie signature uses `crypto.subtle`,
  which runs identically on Node, Vercel, and edge/Workers runtimes
  (no `node:crypto` dependency).
- **Env-driven cookie flags** — `SameSite=None; Secure` in production
  (cross-origin Studio iframe), `Lax` on localhost.

For a container platform (ECS, Cloud Run, GKE) swap the adapter to
`@astrojs/node` (`{ mode: 'standalone' }`) — one line in `astro.config.mjs`.
After deploying: add the production domain to the Sanity project's CORS
origins, point the Studio's `presentationTool` `previewUrl.origin` at the
deployed site, and don't edge-cache SSR HTML without varying on the
`sanity-preview` cookie. (`npm run preview` doesn't apply to the Vercel
adapter — use `vercel dev` or plain `npm run dev` locally.)

## Content backup & seeding

All published content (settings, posts, FAQ questions) is checked in at
`content/seed.ndjson` — Sanity's native dataset-import format, one document
per line, published versions only (system fields regenerate on import).

```sh
npm run content:backup   # re-export the dataset into content/seed.ndjson
npm run content:seed     # import the seed into the dataset (--replace, idempotent)
```

Backup reads with the token from `.env`; seeding runs `sanity dataset import`
from the studio workspace, so it uses your logged-in Sanity CLI session.
Because documents keep their `_id`s, re-seeding is idempotent — and pointing
`PUBLIC_SANITY_PROJECT_ID`/`sanity.cli.ts` at a fresh project/dataset rebuilds
the whole demo from the repo. Re-run `content:backup` after editing content
in the Studio if you want the repo copy current.

## Running just the repro (main / fix branches)

```sh
npm install
npm run build
npm run dev
```
