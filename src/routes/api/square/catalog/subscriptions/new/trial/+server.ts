import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { randomUUID } from 'crypto';


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

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val))
  );
}

const BIGINT_KEYS = new Set(['amount', 'ordinal', 'version', 'monthlyBillingAnchorDate']);
function fromJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (key, val) =>
    BIGINT_KEYS.has(key) && (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val)))
      ? BigInt(val)
      : val
  );
}

const createTrialSubscriptionPlan = async() => {
  const response = await client.catalog.batchUpsert({
    idempotencyKey: randomUUID(),
    batches: [
      {
        objects: [
          {
            type: 'SUBSCRIPTION_PLAN',
            id: '#2-week-trial',
            subscriptionPlanData: {
              name: 'Pro Membership',
            },
          },
          {
            type: 'SUBSCRIPTION_PLAN_VARIATION',
            id: '#pro-2-week-trial',
            subscriptionPlanVariationData: {
              name: 'Pro Monthly (14-Day Free Trial)',
              subscriptionPlanId: '#my-subscription-plan',
              phases: [
                // Phase 0: 14-Day $0 Free Trial
                {
                  uid: 'trial-phase',
                  cadence: 'DAILY',
                  ordinal: 0n,
                  periods: toJsonSafe(14n), // 14-day trial
                  pricing: {
                    type: 'STATIC',
                    price: {
                      amount: 0n,
                      currency: 'USD',
                    },
                  },
                },
                // Phase 1: Standard Recurring Monthly Billing
                {
                  uid: 'regular-phase',
                  cadence: 'MONTHLY',
                  ordinal: 1n,
                  pricing: {
                    type: 'STATIC',
                    price: {
                      amount: 2999n, // $29.99/month
                      currency: 'USD',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  // Extract the generated Variation ID to use when subscribing customers
  const variation = response.objects.find(
    (obj) => obj.type === 'SUBSCRIPTION_PLAN_VARIATION'
  );
  console.log('Plan Variation ID:', variation.id);
  return variation.id;
}
