import type { APIRoute } from 'astro'
import { PREVIEW_COOKIE } from '../../../lib/sanity'

// A partitioned (CHIPS) cookie is only cleared by an expiring Set-Cookie that
// carries the same Partitioned attribute, and cookies.delete() emits a single
// header per cookie name. Expire both variants directly — either may have
// been set depending on browser and context (Safari cross-site iframe vs
// everything else).
export const GET: APIRoute = () => {
  const base = [`${PREVIEW_COOKIE}=`, 'Path=/', 'Max-Age=0']

  const headers = new Headers()
  headers.append('Set-Cookie', base.join('; '))
  headers.append('Set-Cookie', [...base, 'Secure', 'SameSite=None', 'Partitioned'].join('; '))
  headers.set('Location', '/')

  return new Response(null, { status: 307, headers })
}
