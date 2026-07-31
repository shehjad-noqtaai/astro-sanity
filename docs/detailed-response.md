# Detailed response — Sanity + Astro visual editing without React, client wrapping, and preview modes

Everything below was verified against real sources (npm registry, the
`sanity-io/sanity-astro` source at specific tags, and this repo's running
code) — not from memory. Short version: [short-response.md](./short-response.md).
The same material lives as editable Sanity content on this site's `/faq` page.

## The original feedback

An enterprise team with a large Astro + Svelte monorepo, setting up a Sanity
preview environment:

1. *"The current `@sanity/astro` requires React for visual editing. You have a
   SvelteKit integration but it doesn't ship with Astro — so now I have to
   bundle React into my Astro + Svelte monorepo."*
2. *"The integration forces a global `sanityClient` exposed on
   `globalThis.sanityClient`. We already had a central, wrapped Sanity client
   (logging + config options), but the integration forces the global one AND
   its config has to work or it throws."*

Both are legitimate. Both have workarounds implemented in this repo.

---

## 1. The React requirement

### What's actually true

- The `<VisualEditing/>` component in `@sanity/astro` **is** React under the
  hood, and the docs require `@astrojs/react`. The docs justify it with
  "these components use browser-only APIs (`window`, `document.cookie`,
  `postMessage`)" — but that conflates *needing browser APIs* with *needing
  React*. A plain Astro `<script>` is bundled by Vite and runs in the browser
  with full access to all of those. The `client:only="react"` in the docs is
  a *consequence* of choosing React (a component touching `window` at render
  time can't SSR), not a cause.
- The underlying `@sanity/visual-editing` package ships a framework-agnostic
  `enableVisualEditing()` entry point **and** a dedicated `./svelte` export
  (verified in the package's `exports` map).

### The fix in this repo ([PR #1](https://github.com/shehjad-noqtaai/astro-sanity/pull/1))

`src/layouts/Layout.astro` — no framework at all:

```astro
{preview && (
  <script>
    import { enableVisualEditing } from '@sanity/visual-editing'
    enableVisualEditing({ refresh: /* hard-reload fallback */ })
  </script>
)}
```

Svelte shops can instead mount the first-party Svelte component as an island:

```astro
<LiveVisualEditing client:only="svelte" />
<!-- LiveVisualEditing.svelte: import { VisualEditing } from '@sanity/visual-editing/svelte' -->
```

### The honest caveat

`react`, `react-dom`, and `styled-components` are **non-optional peer deps**
of `@sanity/visual-editing` (unlike `svelte`, which is optional), so npm
auto-installs React into `node_modules` either way — the overlay renderer is
internally React and lazy-loads during preview sessions. What matters:

| | Docs' setup | This repo |
|---|---|---|
| `@astrojs/react` integration | required | not needed |
| React in your `package.json` | required | not needed |
| React in published pages | none (lazy) | none — script not even injected |
| React during preview sessions | yes (lazy chunk) | yes (lazy chunk) |

Verified here: `grep react package.json` → nothing; rendered published HTML
contains zero visual-editing code and zero stega.

---

## 2. The forced client

### Version history (from the actual source at each tag)

- **v1.x (2023):** the global *was* the mechanism. The integration injected a
  page-SSR script creating the client on `globalThis.sanityClientInstance`;
  the public API (`useSanityClient()`) just read it back. This is also why
  "the config has to work or it throws" — the injected `createClient(config)`
  ran on every SSR page load whether you used it or not.
- **[v2.0.0, 2023-09-29](https://github.com/sanity-io/sanity-astro/releases/tag/v2.0.0):**
  breaking change — deprecated the hook, exposed `sanityClient` on the
  `sanity:client` virtual module. **This is the version that fixed it.**
- **v3.5.0 (current):** the virtual module is the API, but a back-compat shim
  still injects `globalThis.sanityClient = sanityClient` server-side. It's
  the same client instance (not a second one), server-runtime only (never in
  the browser bundle), and undocumented — ignore it; removing it is a fair
  upstream request.

### How `sanity:client` works (and why you can't inject an instance)

It's a Vite **virtual module**: the integration claims the import specifier
and returns *generated source* — a `createClient()` call with your
`astro.config.mjs` options serialized into it. Requests then target
`https://<projectId>.api.sanity.io/v<apiVersion>/data/query/<dataset>`. A
live client instance can't survive being embedded in generated source, which
is exactly why the integration only accepts plain config.

### The fix in this repo: invert the wrapping

`src/lib/sanity.ts` derives everything from the integration-owned client, so
`astro.config.mjs` is the single source of `projectId`/`dataset`:

```ts
import { sanityClient } from 'sanity:client'

export const publishedClient = sanityClient.withConfig({ useCdn: true, perspective: 'published' })
export const previewClient   = sanityClient.withConfig({ token, perspective: 'drafts', stega: { ... } })
```

`withConfig()` returns a cheap derived instance. The team's logging concern
lives in `loggedFetch()` (times every GROQ **read**; logs in `finally` so
timing prints on success *or* failure; errors still propagate). Lint-ban
direct `sanity:client` imports so only the wrapper circulates.

---

## 3. Preview mode: from env flag to per-request

### Option A — environment variable (where this repo started)

Two server modes: plain `npm run dev` (published) vs
`PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true astro dev` (drafts + stega +
overlays), client config keyed off `import.meta.env` at module level.
~10 lines; fine for a first local bring-up. **Why it can't ship:**

- A deployed preview-mode server serves drafts to the entire internet.
- Editors can't check the public view without a second server.
- Mode switches require restarts — and Astro 7's dev server is a
  **persistent daemon**: starting the other mode while a server runs silently
  reuses the old one, so the flag never applies and Presentation reports
  *"Unable to connect to visual editing"* (we hit this; `npx astro dev stop`
  first, which this repo's dev script now guards).

### Option B — preview URL secret, per request ([PR #4](https://github.com/shehjad-noqtaai/astro-sanity/pull/4); what this repo ships)

The frontend **cannot** detect "this user is logged into Sanity" — the
session lives on the Studio's origin, and heuristics like "am I in an
iframe?" are spoofable and would leak drafts. So the Studio proves itself
with a signed secret (same trust model as `next-sanity`'s draft mode),
hand-rolled for Astro in ~80 lines:

1. **Studio** (`studio/sanity.config.ts`): `presentationTool` gets
   `previewUrl: { origin, previewMode: { enable: '/api/preview/enable' } }`.
2. Opening the **Presentation tab** generates a short-lived secret (a private
   document in the dataset, readable only with a token) and loads the iframe
   through the enable URL.
3. **Enable route** (`src/pages/api/preview/enable.ts`) validates it
   server-side with `validatePreviewUrl()` from `@sanity/preview-url-secret`.
   Invalid/absent → 401.
4. **Cookie**: on success, sets `httpOnly` cookie whose value is
   `HMAC-SHA256(readToken, "sanity-preview")` — unforgeable without the
   server-only token.
5. **Middleware** (`src/middleware.ts`) compares per request →
   `Astro.locals.preview`.
6. **Data**: `loggedFetch(query, params, Astro.locals.preview)` picks drafts +
   stega + token vs published + CDN.
7. **UI**: the overlay script and a "Preview mode — Exit preview" banner
   render only for validated preview visitors.
8. **Exit** (`src/pages/api/preview/disable.ts`) clears the cookie.

Verified matrix (against the running server):

| Request | Draft content | Overlay script | Stega |
|---|---|---|---|
| Plain visitor | no | no | 0 chars |
| Forged `sanity-preview=true` cookie | no | no | 0 chars |
| Validated HMAC cookie | yes | yes | 2,147 chars |

### Cookie security ("can someone spoof it?")

The *name* is public — names never matter. The *value* requires the read
token to compute (2²⁵⁶ brute force otherwise) — and anyone holding the token
doesn't need the cookie. Realistic vectors are **theft, not forgery**: the
value is static and never expires, so `httpOnly` (blocks XSS reads), HTTPS +
`secure` in production, and token rotation (instantly invalidates every
issued cookie) are the controls. Blast radius if stolen: read access to
drafts only — no writes, and the HMAC doesn't reverse to the token.
Hardening: embed a signed expiry in the value; compare with
`timingSafeEqual`. Production across domains: `sameSite: 'none', secure:
true` (flagged in `enable.ts`).

---

## 4. Operational lessons from building this

- **Check the registry, not memory, for versions**: `npm view <pkg> version`
  + `npm view <pkg> peerDependencies`. This repo was first pinned to
  `sanity@^4` / `astro@^5` from stale memory while Astro 7 / Sanity 6 / TS 7
  were current; upgrading needed zero source changes because peer ranges
  allowed it. Don't conflate `sanity` (Studio, v6.x) with `@sanity/client`
  (v7.x) — they version independently.
- **Astro 7 dev daemon**: `astro dev` persists across shells; `astro dev
  stop` before switching env/mode (the npm scripts here guard it).
- **A clean install can drop transitively-hoisted types** (`@types/node`) a
  typecheck silently relied on — declare what you use.
- **Content is code too**: `content/seed.ndjson` + `npm run content:backup` /
  `content:seed` make the dataset rebuildable from the repo (stable `_id`s →
  idempotent re-import).

## 5. Upstream feature requests (sanity-io/sanity-astro & visual-editing)

1. **React-free visual editing path in `@sanity/astro`** — ship
   `<VisualEditing/>` as a vanilla script wrapping `enableVisualEditing()`;
   make `react`/`react-dom`/`styled-components` optional peer deps of
   `@sanity/visual-editing` (they're required even for the `/svelte` export).
2. **Injectable client** — accept a module specifier exporting the client
   (an instance can't cross the config serialization boundary), falling back
   to config-based creation.
3. **Remove the legacy `globalThis.sanityClient` shim** (or document it as
   deprecated with a removal target).

## Repo map

| Where | What |
|---|---|
| `main` history | problem state → React-free fix → full demo (PRs #1–#3) |
| [PR #4](https://github.com/shehjad-noqtaai/astro-sanity/pull/4) | per-request preview mode |
| [PR #6](https://github.com/shehjad-noqtaai/astro-sanity/pull/6) | `/faq` — this material as editable Sanity content |
| `PRD.md` | original problem statement, goals, acceptance criteria |
| `content/seed.ndjson` | full content backup / seed |
