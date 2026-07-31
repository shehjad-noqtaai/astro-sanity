import { createClient, type QueryParams } from '@sanity/client'

// Our central, wrapped Sanity client: logging + org-standard config options.
//
// PROBLEM 2 in practice: the @sanity/astro integration ALSO creates a client
// from astro.config.mjs (exposed as `sanity:client`), and its internals
// (stega/visual editing) use that one. We cannot inject this instance into the
// integration, so the project now has two clients floating around and two
// copies of projectId/dataset config that must be kept in sync by hand.
export const customClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? 'demo123',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-07-01',
  useCdn: false,
})

export async function loggedFetch<T>(query: string, params?: QueryParams): Promise<T> {
  const start = performance.now()
  try {
    return await customClient.fetch<T>(query, params)
  } finally {
    console.log(`[sanity] query took ${Math.round(performance.now() - start)}ms`)
  }
}
