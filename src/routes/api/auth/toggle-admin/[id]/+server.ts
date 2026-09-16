import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Supabase service key:
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ params, locals }) => {
  const { id } = params;
  console.log('Toggle Admin from frontend:', id);

  // Find user:
  const supabaseAdmin = createClient(
    PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('Error listing users:', usersError);
    return json({ success: false, error: usersError.message }, { status: 500 });
  }
  console.log('Users data:', usersData);
  const user = usersData.users.find(u => u.id === id);

  if (!user) {
    console.error('User not found');
    return json({ success: false, error: 'User not found' }, { status: 404 });
  }

  // Toggle admin status
  const newAdminStatus = !user.user_metadata.admin;

  // Update user metadata
  const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      admin: newAdminStatus
    }
  });

  if (updateError) {
    console.error('Error updating user metadata:', updateError);
    return json({ success: false, error: updateError.message }, { status: 500 });
  }

  // Update member table with new admin status
  const { error: membersError } = await locals.supabase
    .from('members')
    .update({
      admin: newAdminStatus,
      metadata: {
        ...user.user_metadata,
        admin: newAdminStatus
      }
    })
    .eq('user_id', user.id);

  if (membersError) {
    console.error('Error updating members table:', membersError);
    return json({ success: false, error: membersError.message }, { status: 500 });
  }

  return json({ success: true, user: updatedUser }, { status: 200 });
};
