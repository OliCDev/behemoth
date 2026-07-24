import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  // Track cookies set during this request to prevent duplicates
  const setCookiesInThisRequest = new Map<string, { value: string, options: any }>();

  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return event.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // First, clear any existing auth token chunks to prevent accumulation
        const existingCookies = event.cookies.getAll();
        const authCookiePrefix = 'sb-uqseuzmnwuthgorjvrdi-auth-token';
        existingCookies.forEach((cookie) => {
          if (cookie.name.startsWith(authCookiePrefix)) {
            event.cookies.delete(cookie.name, { path: '/' });
          }
        });

        /**
         * Note: You have to add the `path` variable to the
         * set and remove method due to sveltekit's cookie API
         * requiring this to be set, setting the path to an empty string
         * will replicate previous/standard behavior (https://kit.svelte.dev/docs/types#public-types-cookies)
         */
        cookiesToSet.forEach((cookie) => {
          const key = `${cookie.name}:${cookie.value}`;
          // Only set if we haven't already set this exact cookie in this request
          if (!setCookiesInThisRequest.has(key)) {
            setCookiesInThisRequest.set(key, { value: cookie.value, options: cookie.options });
            event.cookies.set(cookie.name, cookie.value, { ...cookie.options, path: '/' });
          }
        });
      },
    },
  })

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function uses `getUser()` to validate the
   * JWT by contacting the Supabase Auth server, then retrieves the session.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser()

    if (error || !user) {
      return { session: null, user: null }
    }

    // Only get session after user is validated
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()

    return { session, user }
  }


  const isAuthEndpoint = event.url.pathname.startsWith('/api/auth/')

  // Populate locals with session and user data for non-auth/non-cleanup endpoints
  if (!isAuthEndpoint) {
    const { session, user } = await event.locals.safeGetSession()
    event.locals.session = session
    event.locals.user = user

    // Redirect logged-in comrades from home page to dashboard
    if (user && event.url.pathname === '/') {
      return Response.redirect(new URL('/dashboard', event.url), 303)
    }
  } else {
    // For auth/cleanup endpoints, just set to null - they handle authentication directly
    event.locals.session = null
    event.locals.user = null
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}
