import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Resend:
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_PRIMARY_COLOR, PUBLIC_SECONDARY_COLOR, PUBLIC_TERTIARY_COLOR } from '$env/static/public';

// import logo from '$lib/assets/img/bbs_logo.webp'
const logo = 'https://behemoth.olic.dev/assets/img/bbs_logo.webp', // Absolute URL for email embedding
    primary_color = PUBLIC_PRIMARY_COLOR || '#fc9700',
    secondary_color = PUBLIC_SECONDARY_COLOR || '#f2f6f9',
    tertiary_color = PUBLIC_TERTIARY_COLOR || '#ffffff';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request, locals }) => {

  const { email, invited_by, invited_by_name } = await request.json();
  console.log('from frontend:', email, invited_by, invited_by_name);

  /*
     Workflow:

     - Check if email is already a user. If so, we can create a new invite record, just don't need to
     send the email.
      - If not a user:
     - Send email invite to the email address with a link to join the pod
     - The link will direct them to a signup page with the  ID as a parameter
     - After signup, they will be added to the members table

  */

  // Check if user already exists
  const { data: userData, error: userError } = await locals.supabase
    .from('friends')
    .select('id')
    .eq('email', email)
    .single();

  if (userError && userError.code !== 'PGRST116') { // PGRST116 = No rows found
    console.error('Error checking if user exists:', userError);
    return json({ success: false, error: userError.message }, { status: 500 });
  }




  // Create a unique token for the invitation (in a real app, use a more secure method)
  const inviteToken = crypto.randomUUID();

  // Store the invitation in the database. We do this regardless of whether the user exists or not.
  const { data, error } = await locals.supabase
    .from('invitations')
    .insert([
      { invited_email: email, token: inviteToken, created_by: invited_by, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Expires in 7 days
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }

  // Send the invitation email using Resend
  // const inviteLink = `${PUBLIC_BASE_URL}?invitation_token=${inviteToken}&email=${email}`;
  const inviteLink = `https://behemoth.olic.dev?invitation_token=${inviteToken}&email=${encodeURIComponent(email)}`;

  if (!userData) {

    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `team@behemoth.olic.dev`,
        to: [email],
        subject: `${invited_by_name} has invited you to join Behemoth Battle School!`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background:#f2f6f9;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial, sans-serif;">
            <tr>
              <td align="center" style="padding:30px 15px;">

                <table width="100%" style="max-width:520px; background:#ffffff; border-radius:10px; overflow:hidden;" cellpadding="0" cellspacing="0">

                  <tr>
                    <td align="center" style="padding:25px; background:${tertiary_color};">
                      <img src="${logo}" alt="BBS Logo" width="70" style="display:block; margin-bottom:10px;" />
                      <h2 style="margin:0; color:#ffffff; font-weight:700; font-size:20px;">Behemoth Battle School</h2>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:28px 30px; color:#444444; font-size:15px; line-height:1.6;">
                      <p>${invited_by_name} has invited you to join Behemoth Battle School!</p>

                      <table cellspacing="0" cellpadding="0" style="margin:25px auto;">
                        <tr>
                          <td align="center" style="background:${primary_color}; padding:14px 30px; border-radius:6px;">
                            <a href="${inviteLink}" target="_blank"
                              style="color:white; text-decoration:none; font-weight:bold; font-size:16px;">
                              Continue and Join!
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p>If you didn't request this, you can safely ignore this email.</p>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:15px; background:${primary_color}; color:#ffffff; font-size:12px;">
                      Need help? Reach out to your Sifu <br/>
                      Sent with ❤️ from Tampa by Behemoth Battle School
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
        console.error('Error sending invitation email:', emailError);
        return json({ success: false, error: emailError.message }, { status: 500 });
      }

      console.log('Invitation email sent:', emailData);
    }
    catch (err) {
      console.error('Error sending invitation email:', err);
      return json({ success: false, error: 'Failed to send invitation email' }, { status: 500 });
    }

  }


  return json({ success: true, message: "Invite created successfully" }, { status: 200 });
}
