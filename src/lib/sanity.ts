import { sanityClient } from 'sanity:client'
import type { QueryParams } from '@sanity/client'

// FIX 2: invert the wrapping. Instead of a second createClient() with
// duplicated config, derive our central wrapped client FROM the
// integration-owned one. withConfig() returns a cheap derived instance, so
// astro.config.mjs stays the single source of config and exactly one client
// circulates. Page code imports only from this module — never `sanity:client`
// directly (lint-ban that import if you want to enforce it).
export const client = sanityClient.withConfig({
  // org-standard overrides go here (perspective, token, etc.)
})

export async function loggedFetch<T>(query: string, params?: QueryParams): Promise<T> {
  const start = performance.now()
  try {
    return await client.fetch<T>(query, params)
  } finally {
    console.log(`[sanity] query took ${Math.round(performance.now() - start)}ms`)
  }
}
