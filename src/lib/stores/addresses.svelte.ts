import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type { MemberAddress } from '$lib/types/member';

const createAddressesStore = () => {
	// ─── Core State ────────────────────────────────────────────────────────────
	const addresses = writable<MemberAddress[] | null>(null);
	const loading = writable(false);
	const error = writable<string | null>(null);

	let _supabase: SupabaseClient | null = null;
	let _channel: RealtimeChannel | null = null;
	let _userId: string | null = null;

	// ─── Initializer ───────────────────────────────────────────────────────────
	// Pass `userId` to scope the store (and realtime) to a single user — this is
	// the normal path for a signed-in user managing their own addresses.
	// Omit `userId` (or pass null) for an unscoped/admin view of every user's
	// addresses.
	const init = async (
		initialAddresses: MemberAddress[],
		supabase: SupabaseClient,
		userId: string | null = null
	) => {
		cleanup();
		addresses.set(initialAddresses);
		_supabase = supabase;
		_userId = userId;
		_setupRealtime();
		console.log(
			'Addresses store initialized with',
			initialAddresses.length,
			'items',
			_userId ? `(scoped to user ${_userId})` : '(all users)'
		);
	};

	// ─── Realtime ──────────────────────────────────────────────────────────────
	const _setupRealtime = () => {
		if (!_supabase) return;
		_channel = getRealtimeChannel('user_addresses') as RealtimeChannel;
		_channel
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_addresses',
					...(_userId ? { filter: `user_id=eq.${_userId}` } : {})
				},
				(payload: any) => {
					const current = get(addresses);
					if (!current) return;
					if (payload.eventType === 'INSERT') {
						if (!current.find((i) => i.id === payload.new.id)) {
							addresses.set([...current, payload.new]);
						}
					} else if (payload.eventType === 'UPDATE') {
						addresses.set(current.map((i) => (i.id === payload.new.id ? payload.new : i)));
					} else if (payload.eventType === 'DELETE') {
						addresses.set(current.filter((i) => i.id !== payload.old.id));
					}
				}
			)
			.subscribe();
	};

	// ─── Fetch Addresses ─────────────────────────────────────────────────────────
	// Scoped by default to the store's `_userId`. Pass an explicit `userId` to
	// fetch a specific user's addresses, or `null` to fetch every user's
	// addresses (admin view), regardless of how the store was initialised.
	const fetchAddresses = async (userId: string | null | undefined = _userId) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		let query = _supabase.from('user_addresses').select('*');

		if (userId) {
			query = query.eq('user_id', userId);
		}

		const { data, error: err } = await query;
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		addresses.set(data);
		return { success: true, addresses: data };
	};

	// Convenience: fetch a specific user's addresses (admin lookups).
	const fetchAddressesByUser = (userId: string) => fetchAddresses(userId);

	// Convenience: fetch every user's addresses (admin view). Requires RLS that
	// permits the caller to read other users' rows.
	const fetchAllAddresses = () => fetchAddresses(null);

	// ─── CRUD ──────────────────────────────────────────────────────────────────
	const createAddress = async (item: Omit<MemberAddress, 'id' | 'created_at' | 'updated_at'>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('user_addresses')
			.insert(item)
			.select()
			.single<MemberAddress>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		addresses.update((current) => (current ? [...current, data] : [data]));
		return { success: true, address: data };
	};

	const updateAddress = async (id: string, updates: Partial<MemberAddress>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('user_addresses')
			.update(updates)
			.eq('id', id)
			.select()
			.single<MemberAddress>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		addresses.update((current) => (current ? current.map((i) => (i.id === id ? data : i)) : [data]));
		return { success: true, address: data };
	};

	const deleteAddress = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { error: err } = await _supabase.from('user_addresses').delete().eq('id', id);
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { error: err.message };
		}
		addresses.update((current) => (current ? current.filter((i) => i.id !== id) : null));
		return {
			success: true
		};
	};

	// ─── Set Primary ─────────────────────────────────────────────────────────────
	const setPrimaryAddress = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const current = get(addresses);
		const targetUserId = current?.find((i) => i.id === id)?.user_id ?? _userId;

		// Unset any existing primary for this user, then set the new one.
		if (targetUserId) {
			const { error: unsetErr } = await _supabase
				.from('user_addresses')
				.update({ primary: false })
				.eq('user_id', targetUserId)
				.eq('primary', true);
			if (unsetErr) {
				loading.set(false);
				error.set(unsetErr.message);
				return { success: false, error: unsetErr.message };
			}
		}

		const { data, error: err } = await _supabase
			.from('user_addresses')
			.update({ primary: true })
			.eq('id', id)
			.select()
			.single<MemberAddress>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		addresses.update((list) =>
			list
				? list.map((i) => (i.id === id ? data : { ...i, primary: false }))
				: [data]
		);
		return { success: true, address: data };
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
		addresses,
		loading,
		error,
		init,
		fetchAddresses,
		fetchAddressesByUser,
		fetchAllAddresses,
		createAddress,
		updateAddress,
		deleteAddress,
		setPrimaryAddress,
		cleanup
	};
};

// Singleton — imported directly by any component that needs it
const _store = createAddressesStore();
export const addressesStore = _store;
export const addresses = _store.addresses;
export const loading = _store.loading;
export const error = _store.error;
export const fetchAddresses = _store.fetchAddresses;
export const createAddress = _store.createAddress;
export const updateAddress = _store.updateAddress;
export const deleteAddress = _store.deleteAddress;
export const setPrimaryAddress = _store.setPrimaryAddress;
export const initAddressesStore = _store.init;
export const cleanupAddressesStore = _store.cleanup;
