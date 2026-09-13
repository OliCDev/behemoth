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

  // Update member table with new metadata
  const { error: membersError } = await locals.supabase
    .from('members')
    .update({
      pfp: newMetadata?.pfp,
      admin: newMetadata?.admin,
      metadata: {
        username: newMetadata?.username,
        pronouns: newMetadata?.pronouns,
        pfp: newMetadata?.pfp,
        admin: newMetadata?.admin,
        first_name: newMetadata?.first_name,
        last_name: newMetadata?.last_name,
        phone_number: newMetadata?.phone_number
      },
      addresses: newMetadata?.addresses,
      payment_methods: newMetadata?.payment_methods
    })
    .eq('user_id', user?.id);

  if (membersError) {
    console.error('Error updating friends table:', membersError);
    return json({ success: false, error: membersError.message }, { status: 500 });
  }


  return json({ success: true, user }, { status: 200 });
};
