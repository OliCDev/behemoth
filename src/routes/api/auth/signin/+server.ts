import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { email, password } = await request.json();

  // Sign in the user using the supabase client from locals (which manages cookies)
  const { data, error } = await locals.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }

  const { session, user } = data;

  // Cookies are automatically set by the supabase client
  // The middleware will populate locals.user and locals.session on subsequent requests
  return json({ success: true, session, user });
}