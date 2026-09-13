import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type { Event } from '$lib/types/events';

const createEventsStore = () => {
	// ─── Core State ────────────────────────────────────────────────────────────
	const events = writable<Event[] | null>(null);
	const loading = writable(false);
	const error = writable<string | null>(null);

	let _supabase: SupabaseClient | null = null;
	let _channel: RealtimeChannel | null = null;

	// ─── Initializer ───────────────────────────────────────────────────────────
	const init = async (initialEvents: Event[], supabase: SupabaseClient) => {
		cleanup();
		events.set(initialEvents);
		_supabase = supabase;
		_setupRealtime();
		console.log('Events store initialized with', initialEvents.length, 'items');
	};

	// ─── Realtime ──────────────────────────────────────────────────────────────
	const _setupRealtime = () => {
		if (!_supabase) return;
		_channel = getRealtimeChannel('events') as RealtimeChannel;
		_channel
			.on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload: any) => {
				const current = get(events);
				if (!current) return;
				if (payload.eventType === 'INSERT') {
					if (!current.find((i) => i.id === payload.new.id)) {
						events.set([...current, payload.new]);
					}
				} else if (payload.eventType === 'UPDATE') {
					events.set(current.map((i) => i.id === payload.new.id ? payload.new : i));
				} else if (payload.eventType === 'DELETE') {
					events.set(current.filter((i) => i.id !== payload.old.id));
				}
			})
			.subscribe();
	};

	// ─── Fetch Events ──────────────────────────────────────────────────────────
	// target range of month and year, e.g., 2024-06-01 to 2024-06-30
	const fetchEvents = async (targetRange: { start: string; end: string }) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		let query = _supabase.from('events').select('*');

		if (targetRange.start && targetRange.end) {
      query = query.gte('date', targetRange.start).lte('date', targetRange.end);
    }

		const { data, error: err } = await query;
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		events.set(data);
		return { success: true, events: data };
	};

	// ─── CRUD ──────────────────────────────────────────────────────────────────
	const createEvent = async (item: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('events')
			.insert(item)
			.select()
			.single<Event>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		events.update((current) => current ? [...current, data] : [data]);
		return { success: true, event: data };
	};

	const updateEvent = async (id: string, updates: Partial<Event>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('events')
			.update(updates)
			.eq('id', id)
			.select()
			.single<Event>();
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		events.update((current) => current ? current.map((i) => i.id === id ? data : i) : [data]);
		return { success: true, event: data };
	};

	const deleteEvent = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { error: err } = await _supabase
			.from('events')
			.delete()
			.eq('id', id);
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { error: err.message };
		}
		events.update((current) => current ? current.filter((i) => i.id !== id) : null);
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
		events,
		loading,
		error,
		init,
		fetchEvents,
		createEvent,
		updateEvent,
		deleteEvent,
		cleanup
	};
};

// Singleton — imported directly by any component that needs it
const _store = createEventsStore();
export const eventsStore = _store;
export const events = _store.events;
export const loading = _store.loading;
export const error = _store.error;
export const fetchEvents = _store.fetchEvents;
export const createEvent = _store.createEvent;
export const updateEvent = _store.updateEvent;
export const deleteEvent = _store.deleteEvent;
export const initEventsStore = _store.init;
export const cleanupEventsStore = _store.cleanup;
