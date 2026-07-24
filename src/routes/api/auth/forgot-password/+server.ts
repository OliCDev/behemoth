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

  const { email } = await request.json();
  console.log('from frontend:', email);
  
  const resetToken = crypto.randomUUID();

  // insert into email_resets table
  const { data, error } = await locals.supabase
    .from('email_resets')
    .insert([
      { email, token: resetToken, expires_at: new Date(Date.now() + 60 * 60 * 1000) } // Expires in 1 hour
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating password reset token:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }


  // update user's metadata with reset_token from supabase client using service role key
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

// update user with reset token
  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      reset_token: resetToken
    }
  });

  if (updateError) {
    console.error('Error updating user with reset token:', updateError);
    return json({ success: false, error: updateError.message }, { status: 500 });
  }

  // Send the reset email using Resend
  const reset_link = `https://foodnotbombs-tpa.app/reset-password?code=${resetToken}&email=${encodeURIComponent(email)}`;


    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        
        from: `Food Not Bombs Tampa <team@foodnotbombs-tpa.app>`,
        to: [email],
        subject: `Resetting your password for Tampa Food Not Bombs`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background:#f2f6f9;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial, sans-serif;">
            <tr>
              <td align="center" style="padding:30px 15px;">

                <table width="100%" style="max-width:520px; background:#ffffff; border-radius:10px; overflow:hidden;" cellpadding="0" cellspacing="0">
                  
                  <tr>
                    <td align="center" style="padding:25px; background:${base_color};">
                      <img src="${logo}" alt="TFNB Logo" width="70" style="display:block; margin-bottom:10px;" />
                      <h2 style="margin:0; color:#ffffff; font-weight:700; font-size:20px;">Tampa Food Not Bombs</h2>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 30px; color:#444444; font-size:15px; line-height:1.6;">
                      <p>Forgot your password? No worries! It happens to the best of us. Click the button below to reset it:</p>

                      <table cellspacing="0" cellpadding="0" style="margin:25px auto;">
                        <tr>
                          <td align="center" style="background:${base_color}; padding:14px 30px; border-radius:6px;">
                            <a href="${reset_link}" target="_blank"
                              style="color:white; text-decoration:none; font-weight:bold; font-size:16px;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p>If you didn't request this, you can safely ignore this email.</p>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:15px; background:${base_color}; color:#ffffff; font-size:12px;">
                      Need help? Reach out to K or Oli. <br/>
                      Sent with ❤️ from Tampa by Food Not Bombs
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>

      `
      });

      if (emailError) {
        console.error('Error sending reset email:', emailError);
        return json({ success: false, error: emailError.message }, { status: 500 });
      }

      console.log('Reset email sent:', emailData);
    }
    catch (err) {
      console.error('Error sending reset email:', err);
      return json({ success: false, error: 'Failed to send reset email' }, { status: 500 });
    }

    return json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  }

