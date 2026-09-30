import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

import { SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT } from '$env/static/private';
import { SquareClient, SquareEnvironment } from "square";


// Supabase Admin client for user management
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';


// `environment` must be a full base URL (a SquareEnvironment value), not a bare
// string like "sandbox" — otherwise the SDK treats it as a relative URL.
const environment =
  SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

const client = new SquareClient({
  token: SQUARE_ACCESS_TOKEN,
  environment
});

// The Square SDK returns some numeric fields (e.g. `version`) as BigInt, which
// JSON.stringify (used by SvelteKit's json helper) cannot serialize. Convert
// any BigInt values to strings so the response can be serialized safely.
function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val))
  );
}

/*
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
* */

export const PUT: RequestHandler = async ({ request, params }) => {

  const supabaseAdmin = createClient(
    PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let { squareCustomer } = await request.json();
  console.log('Received request to update Square customer:', squareCustomer);
  let postObj: any = {}


  // console.log('Updating customer in Square:', squareCustomer.squareCustomer); // It works, I promise
  let referenceId = params.id, member
  if (referenceId) {
    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(referenceId);

    if (targetUserError) {
      console.error('Error fetching user metadata:', targetUserError);
      return json({ success: false, error: targetUserError.message }, { status: 500 });
    }

    member = targetUser?.user;
    postObj['customerId'] = member?.user_metadata?.square_customer_id;
    postObj['referenceId'] = referenceId;
    postObj['address'] = {
      addressLine1: squareCustomer.address?.address_line1,
      addressLine2: squareCustomer.address?.address_line2,
      locality: squareCustomer.address?.city,
      administrativeDistrictLevel1: squareCustomer.address?.state,
      postalCode: squareCustomer.address?.postal_code,
    }
  }

  try {
    const { customer, errors } = await client.customers.update(postObj);

    if (errors?.length) {
      console.error('Square returned errors updating customer:', errors);
      return json({ success: false, error: errors[0].detail ?? 'Square error' }, { status: 502 });
    }

    return json({ success: true, customer: toJsonSafe(customer) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating Square customer:', err);
    return json({ success: false, error: message }, { status: 500 });
  }
}
