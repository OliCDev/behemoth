import type { PageServerLoad } from "./$types";


export const load: PageServerLoad = async ({ locals }) => {

  if (!locals.user) {
    return {
      user: null,
    };
  }



  const { data: members, error } = await locals.supabase
    .from('members')
    .select('*')

     if (error) {
      console.error('Error fetching members:', error);
      return {
        user: locals.user,
        members: [],
        error: error.message,
      };
    }

  return {
    user: locals.user,
    members: members ?? [],
  };
};
