import type { LayoutServerLoad } from './$types'
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Use session and user already populated by hooks.server.ts
  const { session, user } = locals;
  const isProtected = !['/login', '/register', '/', '/forgot-password', '/reset-password'].includes(url.pathname);

  if (isProtected && !session) {
    throw redirect(303, '/');
  }

  return {
    session,
    user
  }
}
