import { defineMiddleware } from 'astro:middleware'
import { PREVIEW_COOKIE, previewConfigured, previewCookieValue } from './lib/sanity'

// One server, two audiences: requests carrying the preview cookie (set only
// after @sanity/preview-url-secret validation in /api/preview/enable) render
// drafts with stega + overlays; everyone else gets published content.
export const onRequest = defineMiddleware((context, next) => {
  context.locals.preview =
    previewConfigured &&
    context.cookies.get(PREVIEW_COOKIE)?.value === previewCookieValue
  return next()
})
