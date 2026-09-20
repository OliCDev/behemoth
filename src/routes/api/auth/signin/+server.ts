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

    // create new customer in Square:
    const { data: squareCustomerData, error: squareCustomerError } = await fetch('/api/square/customers/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user?.email,
        name: `${user?.user_metadata.first_name} ${user?.user_metadata.last_name}`,
      }),
    }).then(res => res.json());

    if (squareCustomerError) {
      console.error('Error creating Square customer:', squareCustomerError);
      return json({ success: false, error: squareCustomerError.message }, { status: 500 });
    }

    // Update user metadata with Square customer ID
    const { error: updateSquareIdError } = await locals.supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        square_customer_id: squareCustomerData?.id,
      },
    });

    if (updateSquareIdError) {
      console.error('Error updating user metadata with Square customer ID:', updateSquareIdError);
      return json({ success: false, error: updateSquareIdError.message }, { status: 500 });
    }

    // Update members table with Square customer ID
    const { error: updateMembersError } = await locals.supabase
      .from('members')
      .update({
        metadata: {
          ...user.user_metadata,
          square:
            {
              customer_id: squareCustomerData?.id,
            },
          },
      })
      .eq('user_id', user?.id);

    if (updateMembersError) {
      console.error('Error updating members table with Square customer ID:', updateMembersError);
      return json({ success: false, error: updateMembersError.message }, { status: 500 });
    }

  }

  // Cookies are automatically set by the supabase client
  // The middleware will populate locals.user and locals.session on subsequent requests
  return json({ success: true, session, user });
}
