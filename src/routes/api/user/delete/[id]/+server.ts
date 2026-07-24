// Delete user from supabase completely:
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export async function POST({ params, locals }) {
  const { id } = params;
  console.log('Received request to delete user with id: ', id);

  const supabaseAdmin = createClient(
    PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  //grab user from friends table to get their uuid:
  const { data: userData, error: userError } = await locals.supabase
    .from('friends')
    .select('member')
    .eq('id', id)
    .maybeSingle();

  if (userError) {
    console.error('Error fetching user data: ', userError);
    return json({ success: false, error: userError.message }, { status: 500 });
  }

  if (!userData) {
    console.error('No user found with id: ', id);
    return json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const userId = userData.member;

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  
  if (deleteAuthError) {
    console.error('Error deleting user from auth.users:', deleteAuthError);
    return json({ success: false, error: deleteAuthError.message }, { status: 500 });
  }

  const { error: deleteProfileError } = await locals.supabase
    .from('friends')
    .delete()
    .eq('id', id);

  if (deleteProfileError) {
    console.error('Error deleting user profile:', deleteProfileError);
    return json({ success: false, error: deleteProfileError.message }, { status: 500 });
  }

  console.log('User successfully deleted with id: ', id);
  return json({ success: true });
} 