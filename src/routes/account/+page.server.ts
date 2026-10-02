import type { PageServerLoad } from "./$types";


export const load: PageServerLoad = async ({ locals }) => {


  const { data: paymentMethods, error: paymentMethodsError } = await locals.supabase
    .from('user_payment_methods')
    .select('*')
    .eq('user_id', locals.user?.id);

  if (paymentMethodsError) {
    console.error('Error fetching payment methods:', paymentMethodsError);
    return {
      user: locals.user,
      paymentMethods: [],
      error: paymentMethodsError.message,
    };
  }

  return {
    user: locals.user,
    paymentMethods: paymentMethods ?? [],
  };
};
