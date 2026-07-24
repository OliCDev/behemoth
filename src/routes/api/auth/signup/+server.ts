import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';


export const POST: RequestHandler = async ({ request, locals }) => {
  const { email, password, username } = await request.json(),
   default_pfp = 'https://uqseuzmnwuthgorjvrdi.supabase.co/storage/v1/object/sign/img/Users/pfp_default.avif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iYTdiMWM0Zi0wNTYzLTRmZTQtYTA0Yy0wMmZiZWViYzYwOWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWcvVXNlcnMvcGZwX2RlZmF1bHQuYXZpZiIsImlhdCI6MTc2MzYxMTY0MywiZXhwIjoxNzk1MTQ3NjQzfQ.7f3p36JtVhzE3-5xeo5A9JlIizORlYAQxup3_R9Hayk';



  // Sign up user using the supabase client from locals (which manages cookies)
  const { data, error } = await locals.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        email,
        pfp: default_pfp,
        pronouns: '',
        admin: false,
        invitation: {
          token: '',
          email: '',
          accepted: false
        },
        reset_token: ''
      },
    },
  });

  if (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }

  const { session } = data;

  // console.log('Signup - Session:', session);
  // console.log('Signup - User:', user);

  const { data: { user } } = await locals.supabase.auth.getUser();

  // If no session, user needs to confirm email
  if (!session) {
    // update_name();
    return json({
      success: true,
      requiresEmailConfirmation: true,
      message: 'Please check your email to confirm your account.',
      user
    });
  }

  // Cookies are automatically set by the supabase client
  // The middleware will populate locals.user and locals.session on subsequent requests
  return json({ success: true, session, user });

}