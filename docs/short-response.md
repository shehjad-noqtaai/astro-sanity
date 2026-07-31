# Short response — Sanity + Astro feedback

**Context:** an Astro + Svelte team setting up a Sanity preview environment reported two problems with the official [`@sanity/astro`](https://github.com/sanity-io/sanity-astro) integration. Both are legitimate; both have clean workarounds today, all implemented and verified in this repo. See [detailed-response.md](./detailed-response.md) for the full analysis, or the live `/faq` page (the same answers as editable Sanity content).

## 1. "Visual editing requires React" — you can skip React entirely

The `<VisualEditing/>` component is a React island, but it's a thin wrapper. The underlying `@sanity/visual-editing` package is framework-agnostic:

- **Vanilla:** call `enableVisualEditing()` from a plain Astro `<script>` (what this repo does — `src/layouts/Layout.astro`). Browser APIs (`window`, cookies, `postMessage`) work natively in Astro scripts; React was an implementation choice, not a platform requirement (the [official guide](https://www.sanity.io/docs/visual-editing/astro-visual-editing)'s browser-only-APIs line justifies the `client:only` directive, and its `react()` justification is circular — "required because the components are React components").
- **Svelte:** mount `@sanity/visual-editing/svelte`'s component as a `client:only="svelte"` island.

This repo's frontend has **zero React in `package.json`** and full visual editing. Caveat: `react`/`react-dom`/`styled-components` are hard peer deps of `@sanity/visual-editing`, so npm puts React in `node_modules` — but published pages ship zero visual-editing code (verified), and the overlay renderer lazy-loads only during preview sessions.

## 2. "Forced global client" — upgrade, then invert the wrapping

`globalThis.sanityClient` as the API means you're on **v1.x** — fixed in [**v2.0.0** (2023-09-29)](https://github.com/sanity-io/sanity-astro/releases/tag/v2.0.0), which replaced it with the `sanity:client` virtual module (a server-side `globalThis` shim still exists on latest for back-compat; ignore it). One part of the complaint is **still true on the latest version**: "the config has to work or it throws" — the shim imports `sanity:client` on every SSR render, executing `createClient(config)` whether you use it or not, so the integration's config must stay valid. And you still can't inject your own client instance (integration config crosses a build-time serialization boundary), so **derive your wrapped client from the integration's** instead of creating a second one:

```ts
import { sanityClient } from 'sanity:client'
export const client = sanityClient.withConfig({ /* your overrides */ })
```

One config source (`astro.config.mjs`), one client lineage. See `src/lib/sanity.ts`.

## 3. Preview mode — use the per-request pattern, not an env flag

An env-flag toggle can't ship (a deployed preview server leaks drafts to everyone). This repo implements the production pattern — `@sanity/preview-url-secret` + an unforgeable HMAC cookie + middleware — so **one server serves editors (drafts + overlays) and end users (published, zero preview code)**, decided per request. ~80 lines: `src/middleware.ts`, `src/pages/api/preview/{enable,disable}.ts`, `src/lib/sanity.ts`.

## Pointers

- Minimal fix diff: [PR #1](https://github.com/shehjad-noqtaai/astro-sanity/pull/1) · per-request preview: [PR #4](https://github.com/shehjad-noqtaai/astro-sanity/pull/4) · FAQ content: [PR #6](https://github.com/shehjad-noqtaai/astro-sanity/pull/6)
- We can bring to engineering: React-free `<VisualEditing/>` path + optional React peer deps; injectable client (module specifier); remove the legacy `globalThis` shim.
