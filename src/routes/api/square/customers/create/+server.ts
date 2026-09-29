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

  await client.customers.create(newUser);


  return json({ success: true, message: 'Customer creation endpoint is under construction.' });
}
