import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { AppUser, UserAddress, UserPaymentMethod } from '$lib/types/user';


const createUserStore = () => {
  // ─── Core State ────────────────────────────────────────────────────────────
  const user = writable<User | null>(null);
  const appUser = writable<AppUser | null>(null);
  const loading = writable<boolean>(true);
  const error = writable<string | null>(null);
  const appUserLabel = 'behemoth_bike_members'

  let _channel: RealtimeChannel | null = null;
  let _supabase: SupabaseClient | null = null;

  // ─── Initializer ───────────────────────────────────────────────────────────
  const init = async (initialUser: User, supabase: SupabaseClient) => {
    _supabase = supabase;
    user.set(initialUser);
    loading.set(false);
    _setupRealtime();
    console.log('User store initialized with user:', initialUser);
  };

  // ─── Realtime ──────────────────────────────────────────────────────────────
  const _setupRealtime = () => {
		if (!_supabase) return;
		_channel = getRealtimeChannel(appUserLabel) as RealtimeChannel;
		_channel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'user' }, (payload: any) => {
        console.log('User store received realtime event:', payload);
        const appUser = get(user);
        if (!appUser) return;
        if(payload.eventType === 'UPDATE' && payload.new?.id === appUser.id) {
          user.set(payload.new as User);
        }
      })
      .subscribe();
  }

  // ─── Fetching ─────────────────────────────────────────────────────────────-
  const fetchAppUser = async () => {
    if (!_supabase) return;
    const appUserData = get(appUser);
    if (!appUserData) return;

    const { data, error: fetchError } = await _supabase
      .from('behemoth_bike_members')
      .select('*')
      .eq('user_id', appUserData.user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching app user:', fetchError);
      error.set(fetchError.message);
      return {
        success: false,
        error: fetchError.message,
      }
    }



    // fetch payment methods where user_id = app_user.user_id
    const { data: paymentMethods, error: paymentMethodsError } = await _supabase
      .from('user_payment_methods')
      .select('*')
      .eq('user_id', appUserData.user_id);

    if (paymentMethodsError) {
      console.error('Error fetching payment methods:', paymentMethodsError);
      error.set(paymentMethodsError.message);
      return {
        success: false,
        error: paymentMethodsError.message,
      }
    }

    // fetch addresses where user_id = app_user.user_id
    const { data: addresses, error: addressesError } = await _supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', appUserData.user_id);

    if (addressesError) {
      console.error('Error fetching addresses:', addressesError);
      error.set(addressesError.message);
      return {
        success: false,
        error: addressesError.message,
      }
    }

    const updatedAppUser = {
      ...data,
      addresses: addresses || [],
      payment_methods: paymentMethods || [],
    };

    appUser.set(updatedAppUser as AppUser);
    return {
      success: true,
      data: updatedAppUser as AppUser,
    }
  };
  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const updateUser = async (updates: Partial<User>) => {
    if (!_supabase) return;
    const appUser = get(user);
    if (!appUser) return;

    const { data, error: updateError } = await _supabase
      .from('user')
      .update(updates)
      .eq('id', appUser.id)
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      error.set(updateError.message);
      return {
        success: false,
        error: updateError.message,
      }
    }

    user.set(data as User);
    return {
      success: true,
      data: data as User,
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!_supabase) return;

    const { data, error: updateError } = await _supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      error.set(updateError.message);
      return {
        success: false,
        error: updateError.message,
      }
    }

    if (data.user) {
      user.set(data.user);
    }
    return {
      success: true,
    }
  };

  const updateUserMetadata = async (metadata: Record<string, unknown>) => {
    if (!_supabase) return;

    const { data, error: updateError } = await _supabase.auth.updateUser({
      data: metadata,
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      error.set(updateError.message);
      return {
        success: false,
        error: updateError.message,
      }
    }

    if (data.user) {
      user.set(data.user);
    }
    return {
      success: true,
      data: data.user,
    }
  };

  const updateAppUser = async (updates: Partial<AppUser>) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { data: app_user, error: updateError } = await _supabase
      .from('behemoth_bike_members')
      .update(updates)
      .eq('id', usr.id)
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      error.set(updateError.message);
      return {
        success: false,
        error: updateError.message,
      }
    }

    // fetch payment methods where user_id = app_user.user_id
    const { data: paymentMethods, error: paymentMethodsError } = await _supabase
      .from('user_payment_methods')
      .select('*')
      .eq('user_id', usr.user_id);

    if (paymentMethodsError) {
      console.error('Error fetching payment methods:', paymentMethodsError);
      error.set(paymentMethodsError.message);
      return {
        success: false,
        error: paymentMethodsError.message,
      }
    }

    // fetch addresses where user_id = app_user.user_id
    const { data: addresses, error: addressesError } = await _supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', usr.user_id);

    if (addressesError) {
      console.error('Error fetching addresses:', addressesError);
      error.set(addressesError.message);
      return {
        success: false,
        error: addressesError.message,
      }
    }


    const data = {
      addresses: addresses || [],
      payment_methods: paymentMethods || [],
    };

    appUser.set(data as AppUser);
    return {
      success: true,
      data: data as AppUser,
    }
  }

  // Addresses
  const addAddress = async (address: Partial<UserAddress>) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { data, error: insertError } = await _supabase
      .from('user_addresses')
      .insert({ ...address, user_id: usr.user_id })
      .single();

    if (insertError) {
      console.error('Error adding address:', insertError);
      error.set(insertError.message);
      return {
        success: false,
        error: insertError.message,
      }
    }

    // Update the appUser store with the new address
    const updatedAddresses = [...usr.addresses, data as UserAddress];
    appUser.set({ ...usr, addresses: updatedAddresses });

    return {
      success: true,
      data: data as UserAddress,
    }
  };

  const updateAddress = async (addressId: string, updates: Partial<UserAddress>) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { data, error: updateError } = await _supabase
      .from('user_addresses')
      .update(updates)
      .eq('id', addressId)
      .single();

    if (updateError) {
      console.error('Error updating address:', updateError);
      error.set(updateError.message);
      return {
        success: false,
        error: updateError.message,
      }
    }

    // Update the appUser store with the updated address
    const updatedAddresses = usr.addresses.map(addr =>
      addr.id === addressId ? (data as UserAddress) : addr
    );
    appUser.set({ ...usr, addresses: updatedAddresses });

    return {
      success: true,
      data: data as UserAddress,
  }
  };

  const deleteAddress = async (addressId: string) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { error: deleteError } = await _supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId);

    if (deleteError) {
      console.error('Error deleting address:', deleteError);
      error.set(deleteError.message);
      return {
        success: false,
        error: deleteError.message,
      }
    }

    // Update the appUser store by removing the deleted address
    const updatedAddresses = usr.addresses.filter(addr => addr.id !== addressId);
    appUser.set({ ...usr, addresses: updatedAddresses });

    return {
      success: true,
    }
  };

  // Payment Methods
  const addPaymentMethod = async (paymentMethod: Partial<UserPaymentMethod>) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { data, error: insertError } = await _supabase
      .from('user_payment_methods')
      .insert({ ...paymentMethod, user_id: usr.user_id })
      .single();

    if (insertError) {
      console.error('Error adding payment method:', insertError);
      error.set(insertError.message);
      return {
        success: false,
        error: insertError.message,
      }
    }

    // Update the appUser store with the new payment method
    const updatedPaymentMethods = [...usr.payment_methods, data as UserPaymentMethod];
    appUser.set({ ...usr, payment_methods: updatedPaymentMethods });

    return {
      success: true,
      data: data as UserPaymentMethod,
    }
  };

  const updatePaymentMethod = async (paymentMethodId: string, updates: Partial<UserPaymentMethod>) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { data, error: updateError } = await _supabase
      .from('user_payment_methods')
      .update(updates)
      .eq('id', paymentMethodId)
      .single();

    if (updateError) {
      console.error('Error updating payment method:', updateError);
      error.set(updateError.message);
      return {
        success: false,
        error: updateError.message,
      }
    }

    // Update the appUser store with the updated payment method
    const updatedPaymentMethods = usr.payment_methods.map(pm =>
      pm.id === paymentMethodId ? (data as UserPaymentMethod) : pm
    );
    appUser.set({ ...usr, payment_methods: updatedPaymentMethods });

    return {
      success: true,
      data: data as UserPaymentMethod,
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!_supabase) return;
    const usr = get(appUser);
    if (!usr) return;

    const { error: deleteError } = await _supabase
      .from('user_payment_methods')
      .delete()
      .eq('id', paymentMethodId);

    if (deleteError) {
      console.error('Error deleting payment method:', deleteError);
      error.set(deleteError.message);
      return {
        success: false,
        error: deleteError.message,
      }
    }

    // Update the appUser store by removing the deleted payment method
    const updatedPaymentMethods = usr.payment_methods.filter(pm => pm.id !== paymentMethodId);
    appUser.set({ ...usr, payment_methods: updatedPaymentMethods });

    return {
      success: true,
    }
  };

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = () => {
		if (_channel) {
			globalSupabase.removeChannel(_channel);
			_channel = null;
		}
	};
  // ─── Public API ────────────────────────────────────────────────────────────
  return {
    user,
    loading,
    error,
    init,
    fetchAppUser,
    updateUser,
    updateAppUser,
    updatePassword,
    updateUserMetadata,
    addAddress,
    updateAddress,
    deleteAddress,
    cleanup,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
  };
}

// Singleton — imported directly by any component that needs it
const _store = createUserStore();
export const userStore = _store
export const loading = _store.loading
export const error = _store.error
export const initUserStore = _store.init
export const fetchAppUser = _store.fetchAppUser
export const updateUser = _store.updateUser
export const updatePassword = _store.updatePassword
export const updateUserMetadata = _store.updateUserMetadata
export const cleanupUserStore = _store.cleanup
export const addAddress = _store.addAddress
export const updateAddress = _store.updateAddress
export const deleteAddress = _store.deleteAddress
export const addPaymentMethod = _store.addPaymentMethod
export const updatePaymentMethod = _store.updatePaymentMethod
export const deletePaymentMethod = _store.deletePaymentMethod
