import { sanityClient } from 'sanity:client'
import imageUrlBuilder from '@sanity/image-url'
import type { QueryParams } from '@sanity/client'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

// The single wrapped client, derived from the integration-owned one
// (sanity:client) via withConfig() — astro.config.mjs stays the only source
// of projectId/dataset config. Page code imports only from this module.
//
// In preview mode (PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true) the client
// switches to the drafts perspective with stega encoding so the Presentation
// tool gets click-to-edit overlays and live draft content. Outside preview it
// serves published content from the CDN with no stega.
export const visualEditingEnabled =
  import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === 'true'

const token = import.meta.env.SANITY_API_READ_TOKEN

if (visualEditingEnabled && !token) {
  throw new Error(
    'PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true requires SANITY_API_READ_TOKEN (drafts perspective needs an authenticated client)'
  )
}

export const client = sanityClient.withConfig(
  visualEditingEnabled
    ? {
        token,
        useCdn: false,
        perspective: 'drafts',
        stega: {
          enabled: true,
          studioUrl:
            import.meta.env.PUBLIC_SANITY_STUDIO_URL ?? 'http://localhost:3333',
        },
      }
    : { useCdn: true, perspective: 'published' }
)

export async function loggedFetch<T>(query: string, params?: QueryParams): Promise<T> {
  const start = performance.now()
  try {
    return await client.fetch<T>(query, params)
  } finally {
    console.log(`[sanity] query took ${Math.round(performance.now() - start)}ms`)
  }
}

const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}
