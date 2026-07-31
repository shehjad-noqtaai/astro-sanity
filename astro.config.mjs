import { defineConfig } from 'astro/config'
import sanity from '@sanity/astro'
import react from '@astrojs/react'

// PROBLEM 1: visual editing via @sanity/astro's <VisualEditing/> is a React
// component under the hood, so the React integration must be installed and
// registered even though nothing else in this Astro (+ Svelte) codebase uses React.
//
// PROBLEM 2: the integration builds its own SanityClient from this config and
// exposes it as the `sanity:client` virtual module (older versions:
// globalThis.sanityClient). There is no way to hand it our own wrapped client
// instance, so this config must be valid AND kept in sync with src/lib/custom-client.ts.
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
    react(),
  ],
})
