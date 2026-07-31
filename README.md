# astro-sanity — `@sanity/astro` pain-point repro

Minimal Astro project reproducing two real-world complaints about the official
[`@sanity/astro`](https://github.com/sanity-io/sanity-astro) integration, and
(on the fix branch / PR) the recommended workarounds. See [PRD.md](./PRD.md)
for full context.

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
npm run dev:preview        # Astro on :4321 with visual editing + drafts perspective
(cd studio && npm run dev) # Studio on :3333
```

### 3. Test visual editing

Open http://localhost:3333, log in, and switch to the **Presentation** tab.
The site loads in the iframe with click-to-edit overlays (stega-driven).
Edit a post title or body — the preview updates with draft content. The
document "locations" banner links each post to its page and the home page.

To see the published-visitor experience (no overlays, CDN, published-only,
zero visual-editing code in the HTML), run plain `npm run dev`.

> **Astro 7 gotcha:** `astro dev` runs as a persistent daemon — starting the
> other mode while a server is up silently reuses the running one, so the
> preview flag never applies and Presentation shows "Unable to connect to
> visual editing". Both npm scripts run `astro dev stop` first to guarantee a
> fresh server in the right mode.

## Running just the repro (main / fix branches)

```sh
npm install
npm run build
npm run dev
```
