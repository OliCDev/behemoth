// src/lib/stores/user.svelte.ts
import { getContext, setContext } from 'svelte';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AppUser, UserAddress, UserPaymentMethod } from '$lib/types/user';
import { addressesStore } from '$lib/stores/addresses.svelte';
import { paymentMethodsStore } from '$lib/stores/payment_methods.svelte';

export class UserStore {
	// Raw reactive state — the source of truth.
	user = $state<User | null>(null);
	addresses = $state<UserAddress[]>([]);
	paymentMethods = $state<UserPaymentMethod[]>([]);

	loading = $state(false);
	error = $state<string | null>(null);

	#supabase: SupabaseClient;
	#unsubscribeAddresses: (() => void) | null = null;
	#unsubscribePaymentMethods: (() => void) | null = null;

	// The single unified object your components read from.
	// Recomputes automatically whenever any dependency above changes.
	readonly appUser = $derived<AppUser | null>(
		this.user
			? {
					...this.user,
					user_id: this.user.id,
					addresses: this.addresses,
					payment_methods: this.paymentMethods
				}
			: null
	);

	constructor(supabase: SupabaseClient, user: User | null = null) {
		this.#supabase = supabase;
		this.user = user;

		// Addresses are owned by the shared addresses store; mirror its state into
		// this store's reactive `addresses` so existing consumers keep working.
		this.#unsubscribeAddresses = addressesStore.addresses.subscribe((value) => {
			this.addresses = value ?? [];
		});

		// Payment methods are owned by the shared payment methods store; mirror its
		// state into this store's reactive `paymentMethods` the same way.
		this.#unsubscribePaymentMethods = paymentMethodsStore.paymentMethods.subscribe((value) => {
			this.paymentMethods = value ?? [];
		});
	}

	/** Pull the app-specific rows for the current auth user. */
	async load() {
		if (!this.user) return;
		this.loading = true;
		this.error = null;

		const uid = this.user.id;

		// Scope the shared stores to this user (also wires realtime).
		await Promise.all([
			addressesStore.init([], this.#supabase, uid),
			paymentMethodsStore.init([], this.#supabase, uid)
		]);

		const [addr, pm] = await Promise.all([
			addressesStore.fetchAddresses(uid),
			paymentMethodsStore.fetchPaymentMethods(uid)
		]);

		const addrError = addr && 'error' in addr ? addr.error : null;
		const pmError = pm && 'error' in pm ? pm.error : null;
		if (addrError || pmError) {
			this.error = addrError ?? pmError!;
		}
		// `this.addresses` and `this.paymentMethods` are kept in sync via the store
		// subscriptions.
		this.loading = false;
	}

	// ---- auth metadata: pfp, pronouns, app_plan, ... ----
	async updateMetadata(patch: Record<string, unknown>) {
		const { data, error } = await this.#supabase.auth.updateUser({ data: patch });
		if (error) {
			this.error = error.message;
			return false;
		}
    this.user = data.user; // reassigning triggers appUser recompute

    // Update the members table with the new metadata
    const { error: membersError } = await this.#supabase
      .from('members')
      .update({
        metadata: {
          ...this.user.user_metadata,
          ...patch
        }
      })
      .eq('user_id', this.user.id);

    if (membersError) {
      this.error = membersError.message;
      return false;
    }
		return true;
	}

	// ---- addresses (delegated to the shared addresses store) ----
	async addAddress(input: Omit<UserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
		if (!this.user) return false;
		const res = await addressesStore.createAddress({ ...input, user_id: this.user.id });
		if (!('success' in res) || !res.success) {
			this.error = ('error' in res ? res.error : null) ?? 'Failed to add address';
			return false;
		}
		return true;
	}

	async updateAddress(id: string, patch: Partial<UserAddress>) {
		const res = await addressesStore.updateAddress(id, patch);
		if (!('success' in res) || !res.success) {
			this.error = ('error' in res ? res.error : null) ?? 'Failed to update address';
			return false;
		}
		return true;
	}

	async removeAddress(id: string) {
		const res = await addressesStore.deleteAddress(id);
		if (!('success' in res) || !res.success) {
			this.error = ('error' in res ? res.error : null) ?? 'Failed to remove address';
			return false;
		}
		return true;
	}

	// ---- payment methods (delegated to the shared payment methods store) ----
	async addPaymentMethod(input: Omit<UserPaymentMethod, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
		if (!this.user) return false;
		const res = await paymentMethodsStore.createPaymentMethod({ ...input, user_id: this.user.id });
		if (!('success' in res) || !res.success) {
			this.error = ('error' in res ? res.error : null) ?? 'Failed to add payment method';
			return false;
		}
		return true;
	}

	async updatePaymentMethod(id: string, patch: Partial<UserPaymentMethod>) {
		const res = await paymentMethodsStore.updatePaymentMethod(id, patch);
		if (!('success' in res) || !res.success) {
			this.error = ('error' in res ? res.error : null) ?? 'Failed to update payment method';
			return false;
		}
		return true;
	}

	async removePaymentMethod(id: string) {
		const res = await paymentMethodsStore.deletePaymentMethod(id);
		if (!('success' in res) || !res.success) {
			this.error = ('error' in res ? res.error : null) ?? 'Failed to remove payment method';
			return false;
		}
		return true;
	}

	/**
	 * Optional: keep the store fresh across tabs/devices via Realtime.
	 * Call the returned channel's unsubscribe() on cleanup.
	 */
	subscribeRealtime() {
		// Addresses and payment methods realtime are handled by their respective
		// shared stores (see `load`), so there is nothing extra to subscribe here.
		return null;
	}

	/** Release the shared-store subscriptions and realtime channels. */
	dispose() {
		this.#unsubscribeAddresses?.();
		this.#unsubscribeAddresses = null;
		this.#unsubscribePaymentMethods?.();
		this.#unsubscribePaymentMethods = null;
		addressesStore.cleanup();
		paymentMethodsStore.cleanup();
	}
}

// ---- Context helpers (see note on SSR safety below) ----
const KEY = Symbol('user-store');

export function setUserStore(supabase: SupabaseClient, user: User | null) {
  // console.log('Setting user store with user:', user);
	return setContext(KEY, new UserStore(supabase, user));
}

export function getUserStore(): UserStore {
	return getContext<UserStore>(KEY);
}
