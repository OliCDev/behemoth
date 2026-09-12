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

  // console.log('/auth/signin - User:', user);
  // //
  if (!user.user_metadata.member) {
    const {error: newMemberError } = await locals.supabase
      .from('members')
      .insert({
        user_id: user?.id,
        admin: false,
        pfp: user?.user_metadata.pfp,
        metadata: user?.user_metadata,
      });

    if (newMemberError) {
      console.error('Error inserting into members table:', newMemberError);
      return json({ success: false, error: newMemberError.message }, { status: 500 });
    }

    // Update metadata to reflect that the user is now a member
    const { error: updateMetadataError } = await locals.supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        member: true,
      },
    });

    if (updateMetadataError) {
      console.error('Error updating user metadata:', updateMetadataError);
      return json({ success: false, error: updateMetadataError.message }, { status: 500 });
    }

  }

  // Cookies are automatically set by the supabase client
  // The middleware will populate locals.user and locals.session on subsequent requests
  return json({ success: true, session, user });
}
