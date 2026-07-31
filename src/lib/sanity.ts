import { sanityClient } from 'sanity:client'
import imageUrlBuilder from '@sanity/image-url'
import type { QueryParams } from '@sanity/client'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

// Both clients derive from the integration-owned one (sanity:client) via
// withConfig() — astro.config.mjs stays the only source of projectId/dataset
// config. Preview is decided PER REQUEST (see src/middleware.ts): editors
// arriving through the Studio's Presentation tool carry a cookie set by
// /api/preview/enable after @sanity/preview-url-secret validation; everyone
// else gets published content from the CDN with no stega.
import { createHmac } from 'node:crypto'

const token = import.meta.env.SANITY_API_READ_TOKEN

export const previewConfigured = Boolean(token)
export const PREVIEW_COOKIE = 'sanity-preview'

// The cookie value is an HMAC keyed by the server-only token, so a visitor
// can't forge preview mode by hand-setting `sanity-preview=true`. Only
// /api/preview/enable (after preview-url-secret validation) knows this value.
export const previewCookieValue = previewConfigured
  ? createHmac('sha256', token).update(PREVIEW_COOKIE).digest('hex')
  : ''

const studioUrl =
  import.meta.env.PUBLIC_SANITY_STUDIO_URL ?? 'http://localhost:3333'

export const publishedClient = sanityClient.withConfig({
  useCdn: true,
  perspective: 'published',
})

export const previewClient = sanityClient.withConfig({
  token,
  useCdn: false,
  perspective: 'drafts',
  stega: { enabled: true, studioUrl },
})

export function getClient(preview: boolean) {
  return preview && previewConfigured ? previewClient : publishedClient
}

export async function loggedFetch<T>(
  query: string,
  params?: QueryParams,
  preview = false
): Promise<T> {
  const start = performance.now()
  try {
    return await getClient(preview).fetch<T>(query, params)
  } finally {
    console.log(
      `[sanity] ${preview ? 'preview' : 'published'} query took ${Math.round(performance.now() - start)}ms`
    )
  }
}

const builder = imageUrlBuilder(publishedClient)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}
