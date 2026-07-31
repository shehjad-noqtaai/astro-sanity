import { defineConfig } from 'astro/config'
import sanity from '@sanity/astro'

// FIX 2: this is now the SINGLE source of client config. The integration's
// client (the `sanity:client` virtual module) is derived from it, and our
// wrapped client (src/lib/sanity.ts) is derived from `sanity:client` via
// withConfig() — one client lineage, no duplicated config.
//
// FIX 1: no react() integration — visual editing is wired with the
// framework-agnostic enableVisualEditing() in src/layouts/Layout.astro.
export default defineConfig({
  integrations: [
    sanity({
      projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? 'demo123',
      dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
      apiVersion: '2026-07-01',
      useCdn: false,
      stega: {
        studioUrl: process.env.PUBLIC_SANITY_STUDIO_URL ?? 'http://localhost:3333',
      },
    }),
  ],
})
