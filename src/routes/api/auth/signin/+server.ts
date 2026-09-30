import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

import { PUBLIC_BASE_URL } from '$env/static/public';
const baseUrl = PUBLIC_BASE_URL || 'http://localhost:5173';

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
  console.log('memberrr', user?.user_metadata.member);
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



    // create new customer in Square:

    /*
    await client.customers.create({
        givenName: newUser.,
        familyName: "Earhart",
        emailAddress: "Amelia.Earhart@example.com",
        address: {
            addressLine1: "500 Electric Ave",
            addressLine2: "Suite 600",
            locality: "New York",
            administrativeDistrictLevel1: "NY",
            postalCode: "10003",
            country: "US"
        },
        phoneNumber: "+1-212-555-4240",
        referenceId: "YOUR_REFERENCE_ID",
        note: "a customer"
    });
    */

    const squarePostObj = {
      givenName: user?.user_metadata?.first_name,
      familyName: user?.user_metadata?.last_name,
      emailAddress: user?.user_metadata?.email,
      // address: {
      //   addressLine1: user?.user_metadata.addresses?.[0]?.line1 || '',
      //   addressLine2: user?.user_metadata.addresses?.[0]?.line2 || '',
      //   locality: user?.user_metadata.addresses?.[0]?.city || '',
      //   administrativeDistrictLevel1:   user?.user_metadata.addresses?.[0]?.state || '',
      //   postalCode:  user?.user_metadata.addresses?.[0]?.postal_code || '',
      //   country:  user?.user_metadata.addresses?.[0]?.country || '',
      // },
      // phoneNumber: user?.user_metadata.phone_number || '',
      referenceId: user?.id,
      note: 'New member created from Behemoth app',
    }

    console.log('Creating Square customer with data:', squarePostObj);
    const { success: squareSuccess, customer: squareCustomer, error: squareCustomerError } = await fetch(`${baseUrl}/api/square/customers/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newUser: squarePostObj }),
    }).then(res => res.json());

    if (!squareSuccess) {
      console.error('Error creating Square customer:', squareCustomerError);
      return json({ success: false, error: squareCustomerError }, { status: 500 });
    }



    // Update user metadata with Square customer ID
    const { error: updateSquareIdError } = await locals.supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        member: true,
        square_customer_id: squareCustomer?.id,
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
              customer_id: squareCustomer?.id,
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
