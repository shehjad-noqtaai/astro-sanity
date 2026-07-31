import { defineMiddleware } from 'astro:middleware'
import { PREVIEW_COOKIE, previewConfigured, getPreviewCookieValue } from './lib/sanity'

// One server, two audiences: requests carrying the preview cookie (set only
// after @sanity/preview-url-secret validation in /api/preview/enable) render
// drafts with stega + overlays; everyone else gets published content.
export const onRequest = defineMiddleware(async (context, next) => {
  const cookie = context.cookies.get(PREVIEW_COOKIE)?.value
  context.locals.preview =
    previewConfigured && Boolean(cookie) && cookie === (await getPreviewCookieValue())
  return next()
})
