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

## Running

```sh
npm install
cp .env.example .env   # optional — builds fine with the placeholder project id
npm run build
npm run dev
```
