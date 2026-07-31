import type { APIRoute } from 'astro'
import { validatePreviewUrl } from '@sanity/preview-url-secret'
import {
  PREVIEW_COOKIE,
  previewClient,
  previewConfigured,
  previewCookieOptions,
  getPreviewCookieValue,
} from '../../../lib/sanity'

// The Studio's Presentation tool opens the iframe through this route with a
// short-lived signed secret (stored as a private document in the dataset,
// readable only with a token). Valid secret → preview cookie → the middleware
// flips this visitor into drafts + overlays. Nobody can forge it.
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  if (!previewConfigured) {
    return new Response('Preview not configured: SANITY_API_READ_TOKEN is missing on the server', {
      status: 500,
    })
  }

  const { isValid, redirectTo = '/' } = await validatePreviewUrl(
    previewClient,
    request.url
  )

  if (!isValid) {
    return new Response('Invalid preview secret', { status: 401 })
  }

  cookies.set(PREVIEW_COOKIE, await getPreviewCookieValue(), previewCookieOptions)

  return redirect(redirectTo, 307)
}
