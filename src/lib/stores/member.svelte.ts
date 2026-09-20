import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel, User } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type {
	Member,
	MemberRecord,
	MemberAddress,
	MemberPaymentMethod,
	MemberMetadata
} from '$lib/types/member';
import { initAddressesStore } from '$lib/stores/addresses.svelte';
import { initPaymentMethodsStore } from '$lib/stores/payment_methods.svelte';

const createMemberStore = () => {
	// ─── Core State ────────────────────────────────────────────────────────────
	// `member` is the fused, application-facing view of the current user:
	//   Supabase auth `User` + `members` row + `user_addresses` + `user_payment_methods`
	const member = writable<Member | null>(null);
	const loading = writable(false);
	const error = writable<string | null>(null);

	let _supabase: SupabaseClient | null = null;
	let _channel: RealtimeChannel | null = null;
	let _authUser: User | null = null;
	let _userId: string | null = null;

	// ─── Fuse ──────────────────────────────────────────────────────────────────
	// Combine the auth `User` with the `members` row and the related tables.
	const _fuse = (
		user: User,
		record: MemberRecord | null,
		addresses: MemberAddress[],
		paymentMethods: MemberPaymentMethod[]
	): Member => ({
		...user,
		user_id: user.id,
		metadata: (record?.metadata ?? (user.user_metadata as MemberMetadata)) ?? ({} as MemberMetadata),
		addresses: addresses ?? [],
		payment_methods: paymentMethods ?? []
	});

	// ─── Initializer ─────────────────────────────────────────────────────────────
	// Call once (from the root layout) with the auth user. Fetches the member and
	// seeds the relational sub-stores, then wires up realtime.
	const init = async (authUser: User | null, supabase: SupabaseClient) => {
		const userId = authUser?.id ?? null;
/* 		Idempotent: if we're already initialised for this same user (and Supabase
		client), just refresh the data. Tearing down and re-adding the realtime
		channel would throw, because Supabase reuses channels by topic and forbids
		adding `postgres_changes` callbacks after `subscribe()`. This guards against
		`init` being invoked from more than one place (e.g. the layout and a page). */
		if (_supabase === supabase && _userId === userId && _channel) {
			if (userId) await fetchMember(userId);
			return;
		}
		cleanup();
		_supabase = supabase;
		_authUser = authUser;
		_userId = userId;
		if (_userId) await fetchMember(_userId);
		_setupRealtime();
		console.log('Member store initialized', _userId ? `(user ${_userId})` : '(no user)');
	};

	// ─── Metadata sync ───────────────────────────────────────────────────────────
	// The fused `Member` carries two copies of the profile metadata: the auth
	// `user_metadata` (what almost every component reads) and the `members` row's
	// `metadata` jsonb (the persistence source of truth). Supabase never pushes
	// auth-metadata changes back to the client, so whenever the persisted metadata
	// changes we merge it into `user_metadata` too. Without this, `user_metadata`
	// stays stale after a save and any re-render from the store reverts the UI to
	// the old values.
	const _applyMetadata = (current: Member, metadata: MemberMetadata): Member => ({
		...current,
		metadata,
		user_metadata: { ...current.user_metadata, ...metadata }
	});

	// ─── Realtime ──────────────────────────────────────────────────────────────
	// Watches the `members` row for this user. Addresses and payment methods have
	// their own realtime channels via their dedicated stores.
	const _setupRealtime = () => {
		if (!_supabase || !_userId) return;
		// Never add a second set of callbacks to an already-subscribed channel; this
		// can happen when `init` runs concurrently from multiple call sites.
		if (_channel) return;
		_channel = getRealtimeChannel(`member:${_userId}`) as RealtimeChannel;
		_channel
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'members', filter: `user_id=eq.${_userId}` },
				(payload: any) => {
					const current = get(member);
					if (!current) return;
					if (payload.eventType === 'DELETE') {
						member.set(null);
						return;
					}
					member.set(_applyMetadata(current, (payload.new as MemberRecord).metadata));
				}
			)
			.subscribe();
	};

	// ─── Fetch Member ────────────────────────────────────────────────────────────
	// Loads the `members` row plus the user's addresses and payment methods, fuses
	// them into a `Member`, and seeds the relational sub-stores.
	const fetchMember = async (userId: string | null = _userId) => {
		if (!_supabase) return { success: false, error: 'Store not initialised' };
		if (!userId) return { success: false, error: 'No user id' };
		loading.set(true);
		error.set(null);

		const [memberRes, addressesRes, paymentMethodsRes] = await Promise.all([
			_supabase.from('members').select('*').eq('user_id', userId).single<MemberRecord>(),
			_supabase.from('user_addresses').select('*').eq('user_id', userId),
			_supabase.from('user_payment_methods').select('*').eq('user_id', userId)
		]);

		loading.set(false);

		const err = memberRes.error ?? addressesRes.error ?? paymentMethodsRes.error;
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}

		const baseUser = _authUser ?? ({ id: userId } as User);
		const addresses = (addressesRes.data as MemberAddress[]) ?? [];
		const paymentMethods = (paymentMethodsRes.data as MemberPaymentMethod[]) ?? [];
		const fused = _fuse(baseUser, memberRes.data ?? null, addresses, paymentMethods);
		member.set(fused);

		// Seed the relational stores so the address / payment tabs get their data
		// (and their own realtime channels) without each having to refetch.
		initAddressesStore(addresses, _supabase, userId);
		initPaymentMethodsStore(paymentMethods, _supabase, userId);

		return { success: true, member: fused };
	};

	// ─── CRUD (members table) ──────────────────────────────────────────────────
	const createMember = async (record: Omit<MemberRecord, 'id' | 'created_at' | 'updated_at'>) => {
		if (!_supabase) return { success: false, error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('members')
			.insert(record)
			.select()
			.single<MemberRecord>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		member.update((current) =>
			current && current.id === data.user_id ? _applyMetadata(current, data.metadata) : current
		);
		return { success: true, member: data };
	};

	const updateMember = async (updates: Partial<MemberRecord>, userId: string | null = _userId) => {
		if (!_supabase) return { success: false, error: 'Store not initialised' };
		if (!userId) return { success: false, error: 'No member to update' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('members')
			.update(updates)
			.eq('user_id', userId)
			.select()
			.single<MemberRecord>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		member.update((current) =>
			current && current.id === userId ? _applyMetadata(current, data.metadata) : current
		);
		return { success: true, member: data };
	};

	// Convenience: merge-patch the `metadata` jsonb blob.
	const updateMetadata = async (patch: Partial<MemberMetadata>, userId: string | null = _userId) => {
		const merged = { ...(get(member)?.metadata ?? {}), ...patch } as MemberMetadata;
		return updateMember({ metadata: merged }, userId);
	};

	const deleteMember = async (userId: string | null = _userId) => {
		if (!_supabase) return { success: false, error: 'Store not initialised' };
		if (!userId) return { success: false, error: 'No member to delete' };
		loading.set(true);
		const { error: err } = await _supabase.from('members').delete().eq('user_id', userId);
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		member.update((current) => (current && current.id === userId ? null : current));
		return { success: true };
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
		member,
		loading,
		error,
		init,
		fetchMember,
		createMember,
		updateMember,
		updateMetadata,
		deleteMember,
		cleanup
	};
};

// Singleton — imported directly by any component that needs it
const _store = createMemberStore();
export const memberStore = _store;
export const member = _store.member;
export const loading = _store.loading;
export const error = _store.error;
export const fetchMember = _store.fetchMember;
export const createMember = _store.createMember;
export const updateMember = _store.updateMember;
export const updateMetadata = _store.updateMetadata;
export const deleteMember = _store.deleteMember;
export const initMemberStore = _store.init;
export const cleanupMemberStore = _store.cleanup;
