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

  const { data: subscriptionPlans, error: subscriptionPlansError } = await locals.supabase
    .from('subscription_plans')
    .select('*')

  if (subscriptionPlansError) {
    console.error('Error fetching subscription plans:', subscriptionPlansError);
    return {
      user: locals.user,
      paymentMethods: paymentMethods ?? [],
      subscriptionPlans: [],
      error: subscriptionPlansError.message,
    };
  }

  return {
    user: locals.user,
    paymentMethods: paymentMethods ?? [],
    subscriptionPlans: subscriptionPlans ?? [],
  };
};
