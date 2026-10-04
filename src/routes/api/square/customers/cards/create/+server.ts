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

export const POST: RequestHandler = async ({ request, locals}) => {

  const { cardData } = await request.json();
  let postObj: any = {}
  console.log('Creating new customer card in Square:', cardData);
  // return json({ success: true, message: 'Bypassing for debug purposes.', data: cardData });

  const supabaseAdmin = createClient(
    PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );


  /*
  {
    idempotencyKey: uuidv4(),
    sourceId: token,
    customerId: user?.user_metadata?.square_customer_id,
    memberId: user?.id,
    card: {
      cardholderName: `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}`,
      customerId: user?.user_metadata?.square_customer_id,
      referenceId: user?.id,
    },
  }*/
  try {

    const { card, errors } = await client.cards.create({
      idempotencyKey: cardData?.idempotencyKey,
      sourceId: cardData?.sourceId,
      card: {
        cardholderName: cardData?.card?.cardholderName,
        customerId: cardData?.card?.customerId,
        referenceId: cardData?.card?.referenceId,
      },
    });

    if (errors?.length) {
      console.error('Square returned errors creating card:', errors);
      // return json({ success: false, error: errors[0].detail ?? 'Square error' }, { status: 502 });
    }

    console.log('Square card created successfully:', card);

    // return json({ success: true, message: 'Bypassing for debug purposes.', card: toJsonSafe(card) });


    /*
    Example
    {
        "success": true,
        "message": "Bypassing for debug purposes.",
        "card": {
            "id": "ccof:CA4SEM1mkrYR0-Mfq5MrTWsoRrYoAg",
            "cardBrand": "VISA",
            "last4": "1111",
            "expMonth": "1",
            "expYear": "2031",
            "cardholderName": "Oli Cei",
            "billingAddress": {
                "postalCode": "45465"
            },
            "fingerprint": "sq-1-J4U1SK1Wn00NyAccUTdYaDP0NaUDoIi1hwMU6o39yMVmJUeOmbcmce-Y62_1wJdjsQ",
            "customerId": "XYW28CWHNXBNC441F1C0T18JDM",
            "merchantId": "ML18ESJH6PV4X",
            "referenceId": "03411149-718c-4a65-8a00-b076da264212",
            "enabled": true,
            "cardType": "CREDIT",
            "prepaidType": "NOT_PREPAID",
            "bin": "411111",
            "createdAt": "2026-10-04T03:21:30Z",
            "version": "1",
            "hsaFsa": false
        }
    } */

    // UPdate user_payment_methods table with Square customer ID
    const { data: squareCard, error: addCardError } = await locals.supabase
      .from('user_payment_methods')
      .insert({
        user_id: card?.referenceId,
        card_brand: card?.cardBrand,
        card_last4: card?.last4,
        card_exp_month: card?.expMonth,
        card_exp_year: card?.expYear,
        name: card?.cardholderName,
        primary: false,
      })

    if (addCardError) {
      console.error('Error updating user_payment_records table with Square customer ID:', addCardError);
      return json({ success: false, error: addCardError?.message }, { status: 500 });
    }


    return json({ success: true, card: toJsonSafe(squareCard) });
  } catch (err) {

    console.error('Error creating Square customer card:', err);
    return json({ success: false, error: err }, { status: 500 });
  }
}
