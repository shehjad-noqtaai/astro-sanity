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

  // Safari blocks third-party cookies that aren't partitioned. When the
  // Presentation Tool loads this route inside a cross-site iframe (Studio and
  // site on different domains, i.e. production), add the CHIPS Partitioned
  // attribute so Safari stores the cookie under the Studio's partition.
  // Top-level and same-site (localhost dev) requests stay unpartitioned.
  const partitioned =
    request.headers.get('sec-fetch-dest') === 'iframe' &&
    request.headers.get('sec-fetch-site') === 'cross-site'

  cookies.set(PREVIEW_COOKIE, await getPreviewCookieValue(), {
    ...previewCookieOptions,
    partitioned,
  })

  return redirect(redirectTo, 307)
}
