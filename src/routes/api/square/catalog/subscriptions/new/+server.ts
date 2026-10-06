import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Square
import { SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT } from '$env/static/private';
import { SquareClient, SquareEnvironment } from "square";
import type { CreateCardRequest, CreatePaymentResponse } from "square"

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

  const { catalogData } = await request.json();
  console.log('Upserting catalog in Square:', catalogData);

  try {


    /*
    Example:
    await client.catalog.object.upsert({
            idempotencyKey: "{UNIQUE_KEY}",
            object: {
                type: "SUBSCRIPTION_PLAN",
                id: "#1",
                subscriptionPlanData: {
                    name: "Coffee Subscription",
                    allItems: false,
                    eligibleCategoryIds: [
                        "2CJLFP5C6G74W3U3HD5YAE5W",
                    ],
                },
            },
        });

    */

// FULL data here: https://developer.squareup.com/docs/subscriptions-api/plans-and-variations

    await client.catalog.object.upsert({
      idempotencyKey: catalogData.idempotencyKey,
      object: catalogData.object
    });
  }
  catch (error) {
    console.error('Error upserting catalog in Square:', error);
    return json({ success: false, error: 'Error upserting catalog in Square' }, { status: 500 });
  }

  return json({ success: true, message: 'Catalog upsert endpoint is not yet implemented.' });
}
