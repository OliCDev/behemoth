import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type { Member } from '$lib/types/member';

const createMembersStore = () => {
	// ─── Core State ────────────────────────────────────────────────────────────
	const members = writable<Member[] | null>(null);
	const loading = writable(false);
	const error = writable<string | null>(null);

	let _supabase: SupabaseClient | null = null;
	let _channel: RealtimeChannel | null = null;

	// ─── Initializer ───────────────────────────────────────────────────────────
	const init = async (initialMembers: Member[], supabase: SupabaseClient) => {
		cleanup();
		members.set(initialMembers);
		_supabase = supabase;
		_setupRealtime();
		console.log('Members store initialized with', initialMembers.length, 'items');
	};

	// ─── Realtime ──────────────────────────────────────────────────────────────
	const _setupRealtime = () => {
		if (!_supabase) return;
		_channel = getRealtimeChannel('members') as RealtimeChannel;
		_channel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload: any) => {
				const current = get(members);
				if (!current) return;
				if (payload.eventType === 'INSERT') {
					if (!current.find((i) => i.id === payload.new.id)) {
						members.set([...current, payload.new]);
					}
				} else if (payload.eventType === 'UPDATE') {
					members.set(current.map((i) => i.id === payload.new.id ? payload.new : i));
				} else if (payload.eventType === 'DELETE') {
					members.set(current.filter((i) => i.id !== payload.old.id));
				}
			})
			.subscribe();
	};

	// ─── Fetch Members ─────────────────────────────────────────────────────────
	const fetchMembers = async () => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase.from('members').select('*');
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		members.set(data);
		return { success: true, members: data };
	};

	// ─── CRUD ──────────────────────────────────────────────────────────────────
	const createMember = async (item: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('members')
			.insert(item)
			.select()
			.single<Member>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		members.update((current) => current ? [...current, data] : [data]);
		return { success: true, member: data };
	};

	const updateMember = async (id: string, updates: Partial<Member>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('members')
			.update(updates)
			.eq('id', id)
			.select()
			.single<Member>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		members.update((current) => current ? current.map((i) => i.id === id ? data : i) : [data]);
		return { success: true, member: data };
	};

	const deleteMember = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { error: err } = await _supabase
			.from('members')
			.delete()
			.eq('id', id);
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { error: err.message };
		}
		members.update((current) => current ? current.filter((i) => i.id !== id) : null);
		return {
			success: true
		};
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
		members,
		loading,
		error,
		init,
		fetchMembers,
		createMember,
		updateMember,
		deleteMember,
		cleanup
	};
};

// Singleton — imported directly by any component that needs it
const _store = createMembersStore();
export const membersStore = _store;
export const members = _store.members;
export const loading = _store.loading;
export const error = _store.error;
export const fetchMembers = _store.fetchMembers;
export const createMember = _store.createMember;
export const updateMember = _store.updateMember;
export const deleteMember = _store.deleteMember;
export const initMembersStore = _store.init;
export const cleanupMembersStore = _store.cleanup;
