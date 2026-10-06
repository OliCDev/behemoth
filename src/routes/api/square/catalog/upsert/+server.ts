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
            idempotencyKey: "738341ab-6650-40a3-a7f7-c7cbef08db4a",
            object: {
                type: "ITEM",
                id: "evening-1",
                itemData: {
                    buyerFacingName: "evening_class_1_all_belts",
                    descriptionHtml: "<p>Wing Chun Kuen, also called Wing Chun or Ving Tsun, is a concept-based traditional Southern Chinese kung fu style, and one of the most practical, effective forms of Martial Arts Tampa residents can train in today. Built on quick arm movement, strong legs, and relaxed, efficient technique, it works for adults and kids alike.</p>",
                    imageIds: [
                        "",
                    ],
                    name: "Evening Class 1 - All belts",
                },
            },
        });

        Another:

        idempotencyKey: randomUUID(), // Prevents duplicate executions
              object: {
                id: '#ServiceItem', // Client-supplied ID prefix must start with '#'
                type: 'ITEM',
                itemData: {
                  name: '60-Minute Deep Tissue Massage',
                  description: 'A therapeutic massage focused on realigning deeper layers of muscles.',
                  productType: 'APPOINTMENTS_SERVICE', // This flag designates it as a service
                  variations: [
                    {
                      id: '#ServiceVariation',
                      type: 'ITEM_VARIATION',
                      itemVariationData: {
                        itemId: '#ServiceItem',
                        name: 'Standard Session',
                        pricingType: 'FIXED_PRICING',
                        priceMoney: {
                          amount: 12000, // Price in cents ($120.00)
                          currency: 'USD'
                        },
                        // Service duration specified in milliseconds (e.g., 60 minutes)
                        serviceDuration: 3600000
                      }
                    }
                  ]
                }
              }



    */

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
