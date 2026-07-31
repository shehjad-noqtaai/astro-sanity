# PRD: React-free Visual Editing & Single-Client Setup for `@sanity/astro`

**Status:** Draft
**Owner:** Shehjad Khan
**Repo:** `shehjad-noqtaai/astro-sanity`
**Date:** 2026-07-30

## 1. Background

An enterprise customer running a large Astro + Svelte monorepo reported two pain
points while setting up a Sanity preview environment with the official
[`@sanity/astro`](https://github.com/sanity-io/sanity-astro) integration:

1. **Visual editing drags React in.** The documented `<VisualEditing/>`
   component is a React component under the hood, so the integration docs
   require `@astrojs/react` (+ `react`, `react-dom`) — in a codebase that
   otherwise ships zero React. Astro's core pitch is framework-agnostic
   islands; a first-party integration mandating React is dissonant for
   Svelte/Vue shops.
2. **The integration forces its own client.** `@sanity/astro` builds a
   `SanityClient` from serializable config in `astro.config.mjs` and exposes it
   (older versions: `globalThis.sanityClient`; current versions: the
   `sanity:client` virtual module). There is no way to inject a pre-configured
   client instance. Teams with a central wrapped client (logging, retries,
   custom config) end up with **two clients floating around** and two copies of
   config that must be kept in sync — and the integration's copy has to be
   valid or it throws.

### Verified upstream facts (as of 2026-07-30)

- `@sanity/visual-editing` ships a framework-agnostic `enableVisualEditing()`
  entry point **and** a dedicated `./svelte` export — React is not technically
  required for overlays.
- The overlay renderer is dynamically imported only when visual editing is
  active (inside the Presentation tool / preview mode). Wired correctly, zero
  React bytes ship to published-site visitors.
- However, `react`, `react-dom`, and `styled-components` are **non-optional
  peer dependencies** of `@sanity/visual-editing` (unlike `svelte`, which is
  optional), so React still lands in `node_modules` either way.
- No existing issue on `sanity-io/sanity-astro` tracks either request.

## 2. Goals

- **G1:** Reproduce both problems in a minimal, buildable Astro project
  (`main` branch = problem state).
- **G2:** Demonstrate the recommended workarounds as a reviewable diff
  (fix branch + PR against `main`), proving:
  - visual editing with **no `@astrojs/react` / `react` / `react-dom` in
    `package.json`**, via vanilla `enableVisualEditing()`;
  - a **single** client derived from the integration's (`sanity:client` →
    `withConfig()` → logging wrapper), no duplicated config.
- **G3:** Produce the artifact backing two upstream feature requests to the
  `sanity-io/sanity-astro` team (see §6).

## 3. Non-goals

- Not a production preview environment (no real Studio, draft-mode routes, or
  deploy target; a placeholder project id is used unless env vars are set).
- Not demonstrating the `@sanity/visual-editing/svelte` island alternative in
  code (documented in the README instead, to keep the diff minimal).
- Not patching `@sanity/visual-editing` peer dependencies — that is an
  upstream ask, out of scope here.

## 4. Repro design (`main` branch — problem state)

Minimal Astro 5 site, static output, one page:

| File | Role in the repro |
| --- | --- |
| `astro.config.mjs` | `sanity()` + `react()` integrations; config duplicated with `custom-client.ts` |
| `src/layouts/Layout.astro` | Renders `<VisualEditing/>` from `@sanity/astro/visual-editing` (React) |
| `src/lib/custom-client.ts` | The team's central wrapped client — a **second** `createClient()` |
| `src/pages/index.astro` | Fetches with **both** clients on one page |
| `package.json` | Carries `@astrojs/react`, `react`, `react-dom` only for visual editing |

## 5. Fix design (branch `fix/react-free-single-client`)

1. **Drop React.** Remove `@astrojs/react`, `react`, `react-dom`,
   `@types/react*` and the `react()` integration. Replace `<VisualEditing/>`
   with a plain Astro `<script>` calling `enableVisualEditing()` from
   `@sanity/visual-editing` (added as a direct dependency), gated on the same
   preview flag.
2. **Invert the client wrapping.** Delete `custom-client.ts`. Add
   `src/lib/sanity.ts` that does
   `import { sanityClient } from 'sanity:client'` →
   `sanityClient.withConfig(...)` → logging wrapper. `astro.config.mjs`
   becomes the single source of client config; all page code imports only the
   wrapper.

### Acceptance criteria

- [ ] `npm run build` succeeds on both branches.
- [ ] On the fix branch, `react` and `react-dom` are absent from
      `package.json` dependencies (npm may still hoist them into
      `node_modules` as auto-installed peers of `@sanity/visual-editing` —
      that is the upstream peer-dep wart, called out in the README).
- [ ] On the fix branch, exactly one `createClient`/client-config site exists
      (`astro.config.mjs`); `grep -r createClient src/` returns nothing.
- [ ] The PR diff is small enough to read as "this is all that needs to
      change."

## 6. Upstream feature requests this artifact supports

1. **React-free visual editing path in `@sanity/astro`.** Ship
   `<VisualEditing/>` as a vanilla script wrapping `enableVisualEditing()`
   instead of a React island; make `react`/`react-dom`/`styled-components`
   optional peer deps of `@sanity/visual-editing` (they are currently required
   even when consuming the `/svelte` export).
2. **Injectable/custom client for `@sanity/astro`.** A literal "pass an
   instance" cannot work in `astro.config.mjs` (virtual-module
   serializability), so accept a **module specifier** exporting the client;
   the integration imports it in the virtual module and for its internal
   consumers, falling back to config-based creation.

## 7. Rollout

1. Push problem state to `main`.
2. Open PR from `fix/react-free-single-client` — the diff is the deliverable.
3. Link this repo from the upstream issues and the customer reply.
