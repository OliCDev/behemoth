import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';


export const POST: RequestHandler = async ({ request, locals }) => {

  const newMetadata = await request.json();

  // Update user metadata
  const { data: { user }, error: updateError } = await locals.supabase.auth.updateUser({
    data: newMetadata
  });
  console.log('new metadata received:', newMetadata);

  if (updateError) {
    console.error('Error updating user metadata:', updateError);
    return json({ success: false, error: updateError.message }, { status: 500 });
  }

  console.log('New metadata to save:', user?.user_metadata);

  // Update friends table with new metadata
  const { error: friendsError } = await locals.supabase
    .from('friends')
    .update({
      username: newMetadata?.username,
      pfp: newMetadata?.pfp,
      metadata: {
        pronouns: newMetadata?.pronouns,
        pfp: newMetadata?.pfp
      }
    })
    .eq('member', user?.id);

  if (friendsError) {
    console.error('Error updating friends table:', friendsError);
    return json({ success: false, error: friendsError.message }, { status: 500 });
  }

 
  return json({ success: true, user }, { status: 200 });
};