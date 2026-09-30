import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Square
import { PUBLIC_BASE_URL } from '$env/static/public';
const baseUrl = PUBLIC_BASE_URL || 'http://localhost:5174';

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

  // console.log('New metadata to save:', user?.user_metadata);
  //


  /*
  /* Square customer object example:
  *    {
  *         givenName: "Amelia",
  *         familyName: "Earhart",
  *         emailAddress: "Amelia.Earhart@example.com",
  *         address: {
  *             addressLine1: "500 Electric Ave",
  *             addressLine2: "Suite 600",
  *             locality: "New York",
  *             administrativeDistrictLevel1: "NY",
  *             postalCode: "10003",
  *             country: "US"
  *         },
  *         phoneNumber: "+1-212-555-4240",
  *         referenceId: "YOUR_REFERENCE_ID",
  *         note: "a customer"
  *     }
  */

  // Update member table with new metadata
  const { error: membersError } = await locals.supabase
    .from('members')
    .update({
      pfp: newMetadata?.pfp,
      admin: newMetadata?.admin,
      metadata: {
        username: newMetadata?.username,
        pronouns: newMetadata?.pronouns,
        email: newMetadata?.email,
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
    console.error('Error updating members table:', membersError);
    return json({ success: false, error: membersError.message }, { status: 500 });
  }

  // Update Square customer with new metadata:
  const squarePostObj = {
    customerId: user?.user_metadata?.square_customer_id,
    givenName: newMetadata?.first_name,
    familyName: newMetadata?.last_name,
    emailAddress: newMetadata?.email,
    address: newMetadata?.addresses && newMetadata?.addresses?.length ? newMetadata?.addresses[0] : null,
    phoneNumber: newMetadata?.phone_number || '',
    referenceId: user?.id,
    note: 'Member updated from Behemoth app',
  };


const { success: squareSuccess, customer: squareCustomer, error: squareCustomerError } = await fetch(`${baseUrl}/api/square/customers/update/${user?.user_metadata?.square_customer_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ squareCustomer: squarePostObj }),
  }).then(res => res.json());

  if (!squareSuccess) {
    console.error('Error updating Square customer:', squareCustomerError);
    return json({ success: false, error: squareCustomerError }, { status: 500 });
  }

  return json({ success: true, user, squareCustomer }, { status: 200 });
};
