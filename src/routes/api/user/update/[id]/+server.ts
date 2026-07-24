// Update another user's metadata by ID (admin only) 
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const { id } = params;
  const { metadata } = await request.json();


  // Verify the requester is authenticated
  const { user: callerUser } = await locals.safeGetSession();
  if (!callerUser) {
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Admin client uses the service role key — never exposed to the browser
  const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  }); 

  if(id) {
    const { data, error } = await adminClient.auth.admin.updateUserById(id, {
      user_metadata: metadata
    });
  if (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }

  // update friends table:
 const { error: friendsError } = await locals.supabase
    .from('friends')
    .update({
      username: metadata.username,
      pfp: metadata.pfp,
      admin: metadata.admin,
      metadata: metadata,
      email: metadata.email
    })
    .eq('member', id);  

  if (friendsError) {
    console.error('Error updating friend:', friendsError);
    return json({ success: false, error: friendsError.message }, { status: 500 });
  }

  return json({ success: true, user: data.user });
  } else {
    return json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  
};