// src/lib/stores/user.svelte.ts
import { getContext, setContext } from 'svelte';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AppUser, UserAddress, UserPaymentMethod } from '$lib/types/user';

export class UserStore {
	// Raw reactive state — the source of truth.
	user = $state<User | null>(null);
	addresses = $state<UserAddress[]>([]);
	paymentMethods = $state<UserPaymentMethod[]>([]);

	loading = $state(false);
	error = $state<string | null>(null);

	#supabase: SupabaseClient;

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
	}

	/** Pull the app-specific rows for the current auth user. */
	async load() {
		if (!this.user) return;
		this.loading = true;
		this.error = null;

		const uid = this.user.id;
		const [addr, pm] = await Promise.all([
			this.#supabase
				.from('user_addresses')
				.select('*')
				.eq('user_id', uid)
				.order('created_at'),
			this.#supabase
				.from('user_payment_methods')
				.select('*')
				.eq('user_id', uid)
				.order('created_at')
		]);

		if (addr.error || pm.error) {
			this.error = (addr.error ?? pm.error)!.message;
		} else {
			this.addresses = addr.data ?? [];
			this.paymentMethods = pm.data ?? [];
		}
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
		return true;
	}

	// ---- addresses ----
	async addAddress(input: Omit<UserAddress, 'id' | 'user_id' | 'created_at'>) {
		if (!this.user) return false;
		const { data, error } = await this.#supabase
			.from('user_addresses')
			.insert({ ...input, user_id: this.user.id })
			.select()
			.single();
		if (error) {
			this.error = error.message;
			return false;
		}
		this.addresses.push(data); // mutating a $state array is reactive in Svelte 5
		return true;
	}

	async updateAddress(id: number, patch: Partial<UserAddress>) {
		const { data, error } = await this.#supabase
			.from('user_addresses')
			.update(patch)
			.eq('id', id)
			.select()
			.single();
		if (error) {
			this.error = error.message;
			return false;
		}
		const i = this.addresses.findIndex((a) => a.id === id);
		if (i !== -1) this.addresses[i] = data; // index assignment is reactive too
		return true;
	}

	async removeAddress(id: number) {
		const { error } = await this.#supabase.from('user_addresses').delete().eq('id', id);
		if (error) {
			this.error = error.message;
			return false;
		}
		this.addresses = this.addresses.filter((a) => a.id !== id);
		return true;
	}

	// ---- payment methods (same pattern) ----
	async addPaymentMethod(input: Omit<UserPaymentMethod, 'id' | 'user_id' | 'created_at'>) {
		if (!this.user) return false;
		const { data, error } = await this.#supabase
			.from('user_payment_methods')
			.insert({ ...input, user_id: this.user.id })
			.select()
			.single();
		if (error) {
			this.error = error.message;
			return false;
		}
		this.paymentMethods.push(data);
		return true;
	}

	async removePaymentMethod(id: number) {
		const { error } = await this.#supabase
			.from('user_payment_methods')
			.delete()
			.eq('id', id);
		if (error) {
			this.error = error.message;
			return false;
		}
		this.paymentMethods = this.paymentMethods.filter((p) => p.id !== id);
		return true;
	}

	/**
	 * Optional: keep the store fresh across tabs/devices via Realtime.
	 * Call the returned channel's unsubscribe() on cleanup.
	 */
	subscribeRealtime() {
		if (!this.user) return null;
		const uid = this.user.id;
		return this.#supabase
			.channel(`member:${uid}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'user_addresses', filter: `user_id=eq.${uid}` },
				() => this.load()
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'user_payment_methods', filter: `user_id=eq.${uid}` },
				() => this.load()
			)
			.subscribe();
	}
}

// ---- Context helpers (see note on SSR safety below) ----
const KEY = Symbol('user-store');

export function setUserStore(supabase: SupabaseClient, user: User | null) {
  console.log('Setting user store with user:', user);
	return setContext(KEY, new UserStore(supabase, user));
}

export function getUserStore(): UserStore {
	return getContext<UserStore>(KEY);
}
