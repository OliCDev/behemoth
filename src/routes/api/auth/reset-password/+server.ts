import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Resend:
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

// Supabase service key:
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
 

// import logo from '$lib/assets/img/tfnb_logo.png'
const logo = 'https://foodnotbombs-tpa.app/assets/img/tfnb_logo.png', // Absolute URL for email embedding
  base_color = '#312c85'

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request, locals }) => { 

  const { password, token } = await request.json();
  console.log('Reset Password from frontend:', password, token);

// check the email_resets table for the token and get the associated email
  const { data: resetData, error: resetError } = await locals.supabase
    .from('email_resets')
    .select('email, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (resetError) {
    console.error('Error fetching reset token data:', resetError);
    return json({ success: false, error: resetError.message }, { status: 500 });
  }

  if (!resetData) {
    console.error('Invalid password reset token');
    return json({ success: false, error: 'Invalid password reset token' }, { status: 400 });
  }

  if (new Date(resetData.expires_at) < new Date()) {
    console.error('Password reset token has expired');
    return json({ success: false, error: 'Password reset token has expired' }, { status: 400 });
  }

  const email = resetData.email;


  // At this point, we have a valid reset token and the associated email. We can now update the user's password and clear the reset token:

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

  const user = usersData.users.find(u => u.email === email);

  if (!user) {
    console.error('No user found with the provided email');
    return json({ success: false, error: 'No user found with the provided email' }, { status: 400 });
  } 

    // Update user's password and clear reset token
  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password,
    user_metadata: {
      reset_token: null
    }
  });

  if (updateError) {
    console.error('Error updating user password:', updateError);
    return json({ success: false, error: updateError.message }, { status: 500 });
  }   
    return json({ success: true, message: 'Password has been successfully reset.' });
  }

