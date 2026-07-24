// Sign out

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals }) => {
  // Sign out the user using the supabase client from locals (which manages cookies)
  const { error } = await locals.supabase.auth.signOut();

  if (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }

  // Cookies are automatically cleared by the supabase client
  // The middleware will populate locals.user and locals.session on subsequent requests
  return json({ success: true });
} 