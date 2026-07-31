import { defineConfig, envField } from 'astro/config'
import vercel from '@astrojs/vercel'
import svelte from '@astrojs/svelte'
import sanity from '@sanity/astro'

// Single source of client config (see src/lib/sanity.ts, which derives the
// wrapped client from the sanity:client virtual module). No react()
// integration — visual editing is wired with the framework-agnostic
// enableVisualEditing() in src/layouts/Layout.astro.
//
// output: 'server' so every request renders fresh content — required for the
// per-request preview mode.
//
// Adapter: Vercel. For a container platform (ECS, Cloud Run, GKE), swap to
// @astrojs/node ({ mode: 'standalone' }) — no other changes needed.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  env: {
    schema: {
      // Server secret read at RUNTIME (not inlined at build), so platforms
      // that inject secrets into the running environment (Vercel, k8s,
      // Cloud Run) work even when the build happens without the token.
      SANITY_API_READ_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
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
    svelte(),
  ],
})
