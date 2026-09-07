import { json, redirect, type Handle } from '@sveltejs/kit'
import { AUTH_COOKIE_NAME, getAuthService } from '$lib/server/auth'
import { isAuthenticationEnabled } from '$lib/server/auth-config'

const PUBLIC_ROUTES = new Set(['/login', '/health'])

export const handle: Handle = async ({ event, resolve }) => {
  if (!isAuthenticationEnabled()) {
    event.locals.user = null
    if (event.url.pathname === '/login' && event.request.method === 'GET') {
      redirect(303, '/catalog')
    }
    return resolve(event)
  }

  const token = event.cookies.get(AUTH_COOKIE_NAME)
  const session = token ? getAuthService().getSession(token) : null
  event.locals.user = session ? { email: session.email } : null

  const isPublic = PUBLIC_ROUTES.has(event.url.pathname) || event.route.id === null
  if (!event.locals.user && !isPublic) {
    if (event.url.pathname.startsWith('/api/')) {
      return json({ error: 'Authentication required' }, { status: 401 })
    }
    const next = `${event.url.pathname}${event.url.search}`
    redirect(303, `/login?next=${encodeURIComponent(next)}`)
  }

  if (event.locals.user && event.url.pathname === '/login' && event.request.method === 'GET') {
    redirect(303, '/catalog')
  }

  return resolve(event)
}
