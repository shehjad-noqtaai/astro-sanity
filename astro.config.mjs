import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import sanity from '@sanity/astro'

// Single source of client config (see src/lib/sanity.ts, which derives the
// wrapped client from the sanity:client virtual module). No react()
// integration — visual editing is wired with the framework-agnostic
// enableVisualEditing() in src/layouts/Layout.astro.
//
// output: 'server' so every request renders fresh content — required for the
// Presentation tool to reflect draft edits live.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sanity({
      projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? 'im07utyl',
      dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
      apiVersion: '2026-07-01',
      useCdn: false,
      stega: {
        studioUrl: process.env.PUBLIC_SANITY_STUDIO_URL ?? 'http://localhost:3333',
      },
    }),
  ],
})
