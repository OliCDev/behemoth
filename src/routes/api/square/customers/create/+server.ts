import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

import { SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT } from '$env/static/private';

import { SquareClient } from "square";
const client = new SquareClient({
  token: SQUARE_ACCESS_TOKEN,
  environment: SQUARE_ENVIRONMENT
});

export const POST: RequestHandler = async ({ request, locals }) => {

  const { newUser } = await request.json();
  console.log('Creating new customer in Square:', newUser);

  // await client.customers.create({
  //     givenName: newUser.,
  //     familyName: "Earhart",
  //     emailAddress: "Amelia.Earhart@example.com",
  //     address: {
  //         addressLine1: "500 Electric Ave",
  //         addressLine2: "Suite 600",
  //         locality: "New York",
  //         administrativeDistrictLevel1: "NY",
  //         postalCode: "10003",
  //         country: "US"
  //     },
  //     phoneNumber: "+1-212-555-4240",
  //     referenceId: "YOUR_REFERENCE_ID",
  //     note: "a customer"
  // });


  return json({ success: true, message: 'Customer creation endpoint is under construction.' });
}
