// Grab data via the pod ID in the URL
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }: { locals: any; }) => {


  // Check if the user is authenticated
  const { data: { session } } = await locals.supabase.auth.getSession();

  if (session) {
    // If the user is authenticated, redirect to the home page
    throw redirect(303, '/');
  }

  // If the user is not authenticated, return an empty object (or any necessary data for the login page)
  return {};
};