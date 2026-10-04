import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Square
import { SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT } from '$env/static/private';
import { SquareClient, SquareEnvironment } from "square";

/*
  `environment` must be a full base URL (a SquareEnvironment value), not a bare
  string like "sandbox" — otherwise the SDK treats it as a relative URL.
*/
const environment =
  SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

const client = new SquareClient({
  token: SQUARE_ACCESS_TOKEN,
  environment
});

// Supabase
// -- Admin client for user management
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

/*
  The Square SDK returns some numeric fields (e.g. `version`) as BigInt, which
  JSON.stringify (used by SvelteKit's json helper) cannot serialize. Convert
  any BigInt values to strings so the response can be serialized safely.
*/
function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val))
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {

  const { paymentData } = await request.json();
  console.log('Creating new payment in Square:', paymentData);



  return json({ success: true, message: 'Payment creation endpoint is not yet implemented.', paymentData });
}
