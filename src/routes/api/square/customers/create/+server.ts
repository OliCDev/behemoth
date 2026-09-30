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

export const POST: RequestHandler = async ({ request, locals}) => {

  const { newUser } = await request.json();
  console.log('Creating new customer in Square:', newUser);


  const supabaseAdmin = createClient(
    PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let postObj: any = {}, square_req_id


  // console.log('Updating customer in Square:', squareCustomer.squareCustomer); // It works, I promise



  try {
    const { customer, errors } = await client.customers.create(newUser);

    if (errors?.length) {
      console.error('Square returned errors creating customer:', errors);
      return json({ success: false, error: errors[0].detail ?? 'Square error' }, { status: 502 });
    }

    // Add to new user's metadata the Square customer ID for future reference:
    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(newUser?.referenceId);
    if (targetUserError) {
      console.error('Error fetching user from Supabase:', targetUserError);
      return json({ success: false, error: targetUserError.message }, { status: 500 });
    }

    const { error: updateSquareIdError } = await supabaseAdmin.auth.admin.updateUserById(newUser?.referenceId,{
      user_metadata: {
        member: true,
        square_customer_id: customer?.id,
      }
    });

    if (updateSquareIdError) {
      console.error('Error updating user metadata with Square customer ID:', updateSquareIdError);
      return json({ success: false, error: updateSquareIdError.message }, { status: 500 });
    }

    // UPdate members table with Square customer ID
    const { error: updateMembersError } = await locals.supabase
      .from('members')
      .update({
        metadata: {
          ...targetUser?.user?.user_metadata,
          square:
            {
              customer_id: customer?.id,
            },
          },
      })
      .eq('user_id', newUser?.referenceId);

    if (updateMembersError) {
      console.error('Error updating members table with Square customer ID:', updateMembersError);
      return json({ success: false, error: updateMembersError.message }, { status: 500 });
    }


    return json({ success: true, customer: toJsonSafe(customer) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating Square customer:', err);
    return json({ success: false, error: message }, { status: 500 });
  }
}
