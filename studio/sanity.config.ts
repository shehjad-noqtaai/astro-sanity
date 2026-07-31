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
      // The Astro app must run with PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true
      // (npm run dev:preview) for overlays + draft content to appear here.
      previewUrl: previewOrigin,
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
