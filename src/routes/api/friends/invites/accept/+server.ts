import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';


export const POST: RequestHandler = async ({ request, locals }) => {

  const { invited_email, token } = await request.json();

  console.log('Recieving from frontend: ', invited_email, token);


  const { data: invitationData, error: invitationError } = await locals.supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('invited_email', invited_email)
    .maybeSingle();

  if (invitationError) {
    console.error('Error validating invitation token:', invitationError);
    return json({ success: false, error: invitationError.message }, { status: 400 });
  }

  if (!invitationData) {
    console.error('No matching invitation found for the given token and email');
    return json({ success: false, error: 'Invalid or expired invitation token' }, { status: 400 });
  }

  if (new Date(invitationData.expires_at) < new Date()) {
    console.error('Invitation token has expired');
    return json({ success: false, error: 'Invitation token has expired' }, { status: 400 });
  }

  const { error } = await locals.supabase
    .from('invitations')
    .update({
      accepted_at: new Date().toISOString()
    })
    .eq('token', token)
    .eq('invited_email', invited_email);

  if (error) {
    console.error('Error accepting invitation:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }

  // Get the user by email. All server side to protect against spooooooooping
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

  const user = usersData.users.find(u => u.email === invited_email);

  if (!user) {
    console.error('No user found with the invited email');
    return json({ success: false, error: 'No user found with the invited email' }, { status: 400 });
  } 
  


  // add to friends table:
  const { data, error: friendError } = await locals.supabase
    .from('friends')
    .insert({
      member: user.id,
      username: user.user_metadata.username,
      pfp: user.user_metadata.pfp,
      admin: user.user_metadata.admin,
      metadata: user.user_metadata.metadata,
      email: user.email
    });

  if (friendError) {
    console.error('Error adding friend after accepting invitation:', friendError);
    return json({ success: false, error: friendError.message }, { status: 500 });
  }

  // Delete the invitation after acceptance
  const { error: deleteError } = await locals.supabase
    .from('invitations')
    .delete()
    .eq('invited_email', invited_email);

  if (deleteError) {
    console.error('Error deleting invitation after acceptance:', deleteError);
    return json({ success: false, error: deleteError.message }, { status: 500 });
  }

  return json({ success: true, message: 'Invitation accepted and deleted successfully.' }, { status: 200 });
}