import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type { MemberPaymentMethod } from '$lib/types/member';

const createPaymentMethodsStore = () => {
	// ─── Core State ────────────────────────────────────────────────────────────
	const paymentMethods = writable<MemberPaymentMethod[] | null>(null);
	const loading = writable(false);
	const error = writable<string | null>(null);

	let _supabase: SupabaseClient | null = null;
	let _channel: RealtimeChannel | null = null;
	let _userId: string | null = null;

	// ─── Initializer ───────────────────────────────────────────────────────────
	// Pass `userId` to scope the store (and realtime) to a single user — this is
	// the normal path for a signed-in user managing their own payment methods.
	// Omit `userId` (or pass null) for an unscoped/admin view of every user's
	// payment methods.
	const init = async (
		initialPaymentMethods: MemberPaymentMethod[],
		supabase: SupabaseClient,
		userId: string | null = null
	) => {
		cleanup();
		paymentMethods.set(initialPaymentMethods);
		_supabase = supabase;
		_userId = userId;
		_setupRealtime();
		console.log(
			'Payment methods store initialized with',
			initialPaymentMethods.length,
			'items',
			_userId ? `(scoped to user ${_userId})` : '(all users)'
		);
	};

	// ─── Realtime ──────────────────────────────────────────────────────────────
	const _setupRealtime = () => {
		if (!_supabase) return;
		_channel = getRealtimeChannel('user_payment_methods') as RealtimeChannel;
		_channel
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_payment_methods',
					...(_userId ? { filter: `user_id=eq.${_userId}` } : {})
				},
				(payload: any) => {
					const current = get(paymentMethods);
					if (!current) return;
					if (payload.eventType === 'INSERT') {
						if (!current.find((i) => i.id === payload.new.id)) {
							paymentMethods.set([...current, payload.new]);
						}
					} else if (payload.eventType === 'UPDATE') {
						paymentMethods.set(current.map((i) => (i.id === payload.new.id ? payload.new : i)));
					} else if (payload.eventType === 'DELETE') {
						paymentMethods.set(current.filter((i) => i.id !== payload.old.id));
					}
				}
			)
			.subscribe();
	};

	// ─── Fetch Payment Methods ───────────────────────────────────────────────────
	// Scoped by default to the store's `_userId`. Pass an explicit `userId` to
	// fetch a specific user's payment methods, or `null` to fetch every user's
	// payment methods (admin view), regardless of how the store was initialised.
	const fetchPaymentMethods = async (userId: string | null | undefined = _userId) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		let query = _supabase.from('user_payment_methods').select('*');

		if (userId) {
			query = query.eq('user_id', userId);
		}

		const { data, error: err } = await query;
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		paymentMethods.set(data);
		return { success: true, paymentMethods: data };
	};

	// Convenience: fetch a specific user's payment methods (admin lookups).
	const fetchPaymentMethodsByUser = (userId: string) => fetchPaymentMethods(userId);

	// Convenience: fetch every user's payment methods (admin view). Requires RLS
	// that permits the caller to read other users' rows.
	const fetchAllPaymentMethods = () => fetchPaymentMethods(null);

	// ─── CRUD ──────────────────────────────────────────────────────────────────
	const createPaymentMethod = async (
		item: Omit<MemberPaymentMethod, 'id' | 'created_at' | 'updated_at'>
	) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('user_payment_methods')
			.insert(item)
			.select()
			.single<MemberPaymentMethod>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		paymentMethods.update((current) => (current ? [...current, data] : [data]));
		return { success: true, paymentMethod: data };
	};

	const updatePaymentMethod = async (id: string, updates: Partial<MemberPaymentMethod>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('user_payment_methods')
			.update(updates)
			.eq('id', id)
			.select()
			.single<MemberPaymentMethod>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		paymentMethods.update((current) =>
			current ? current.map((i) => (i.id === id ? data : i)) : [data]
		);
		return { success: true, paymentMethod: data };
	};

	const deletePaymentMethod = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { error: err } = await _supabase.from('user_payment_methods').delete().eq('id', id);
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { error: err.message };
		}
		paymentMethods.update((current) => (current ? current.filter((i) => i.id !== id) : null));
		return {
			success: true
		};
	};

	// ─── Set Primary ─────────────────────────────────────────────────────────────
	const setPrimaryPaymentMethod = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const current = get(paymentMethods);
		const targetUserId = current?.find((i) => i.id === id)?.user_id ?? _userId;

		// Unset any existing primary for this user, then set the new one.
		if (targetUserId) {
			const { error: unsetErr } = await _supabase
				.from('user_payment_methods')
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
			.from('user_payment_methods')
			.update({ primary: true })
			.eq('id', id)
			.select()
			.single<MemberPaymentMethod>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		paymentMethods.update((list) =>
			list ? list.map((i) => (i.id === id ? data : { ...i, primary: false })) : [data]
		);
		return { success: true, paymentMethod: data };
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
		paymentMethods,
		loading,
		error,
		init,
		fetchPaymentMethods,
		fetchPaymentMethodsByUser,
		fetchAllPaymentMethods,
		createPaymentMethod,
		updatePaymentMethod,
		deletePaymentMethod,
		setPrimaryPaymentMethod,
		cleanup
	};
};

// Singleton — imported directly by any component that needs it
const _store = createPaymentMethodsStore();
export const paymentMethodsStore = _store;
export const paymentMethods = _store.paymentMethods;
export const loading = _store.loading;
export const error = _store.error;
export const fetchPaymentMethods = _store.fetchPaymentMethods;
export const fetchPaymentMethodsByUser = _store.fetchPaymentMethodsByUser;
export const fetchAllPaymentMethods = _store.fetchAllPaymentMethods;
export const createPaymentMethod = _store.createPaymentMethod;
export const updatePaymentMethod = _store.updatePaymentMethod;
export const deletePaymentMethod = _store.deletePaymentMethod;
export const setPrimaryPaymentMethod = _store.setPrimaryPaymentMethod;
export const initPaymentMethodsStore = _store.init;
export const cleanupPaymentMethodsStore = _store.cleanup;
