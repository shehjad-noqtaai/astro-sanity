import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import { schemaTypes } from './schemaTypes'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'im07utyl'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'
const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN ?? 'http://localhost:4321'

export default defineConfig({
  name: 'default',
  title: 'astro-sanity-demo',
  projectId,
  dataset,
  plugins: [
    structureTool(),
    presentationTool({
      // Preview is enabled per request: Presentation opens the iframe through
      // /api/preview/enable with a signed secret; the Astro app validates it
      // and sets a preview cookie. Plain `npm run dev` serves both audiences.
      previewUrl: {
        origin: previewOrigin,
        previewMode: {
          enable: '/api/preview/enable',
        },
      },
      resolve: {
        locations: {
          post: {
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [
                { title: doc?.title ?? 'Untitled', href: `/posts/${doc?.slug}` },
                { title: 'All posts', href: '/' },
              ],
            }),
          },
          settings: {
            select: { title: 'title' },
            resolve: () => ({
              locations: [{ title: 'Home', href: '/' }],
            }),
          },
        },
      },
    }),
  ],
  schema: {
    types: schemaTypes,
  },
})
