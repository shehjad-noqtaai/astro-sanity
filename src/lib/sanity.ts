import { sanityClient } from 'sanity:client'
import { SANITY_API_READ_TOKEN } from 'astro:env/server'
import { createImageUrlBuilder } from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url'
import type { QueryParams } from '@sanity/client'

// Both clients derive from the integration-owned one (sanity:client) via
// withConfig() — astro.config.mjs stays the only source of projectId/dataset
// config. Preview is decided PER REQUEST (see src/middleware.ts): editors
// arriving through the Studio's Presentation tool carry a cookie set by
// /api/preview/enable after @sanity/preview-url-secret validation; everyone
// else gets published content from the CDN with no stega.
//
// The token comes from astro:env (server secret, read at runtime) so
// platforms that inject secrets into the running environment — Vercel, k8s,
// Cloud Run — work even when `astro build` ran without the token present.
const token = SANITY_API_READ_TOKEN ?? undefined

export const previewConfigured = Boolean(token)
export const PREVIEW_COOKIE = 'sanity-preview'

// Cookie attributes: cross-origin iframes (Studio and site on different
// domains over HTTPS) need SameSite=None + Secure in production; localhost
// dev over plain HTTP needs Lax.
export const previewCookieOptions = {
  path: '/',
  httpOnly: true,
  ...(import.meta.env.PROD
    ? { sameSite: 'none' as const, secure: true }
    : { sameSite: 'lax' as const }),
}

// The cookie value is an HMAC keyed by the server-only token, so a visitor
// can't forge preview mode by hand-setting `sanity-preview=true`. Web Crypto
// (not node:crypto) so the same code runs on Node, Vercel, and edge/Workers
// runtimes. Computed once per server lifetime; same hex output as
// createHmac('sha256', token).update(PREVIEW_COOKIE).digest('hex').
let previewCookieValuePromise: Promise<string> | null = null

export function getPreviewCookieValue(): Promise<string> {
  if (!previewConfigured) return Promise.resolve('')
  previewCookieValuePromise ??= (async () => {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(token),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(PREVIEW_COOKIE))
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  })()
  return previewCookieValuePromise
}

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
    return await getClient(preview).fetch<T>(query, params ?? {})
  } finally {
    console.log(
      `[sanity] ${preview ? 'preview' : 'published'} query took ${Math.round(performance.now() - start)}ms`
    )
  }
}

const builder = createImageUrlBuilder(publishedClient)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}
