import { writable, get } from 'svelte/store';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getRealtimeChannel, supabase as globalSupabase } from '$lib/supabaseClient';
import type { SubscriptionPlan } from '$lib/types/subscription_plans';
import { v4 as uuidv4 } from 'uuid';

// Updating Square:
import { PUBLIC_BASE_URL } from '$env/static/public';
const baseUrl = PUBLIC_BASE_URL || 'http://localhost:5174';

// Square bills in the currency's smallest unit (e.g. cents). These currencies
// have no minor unit, so the price is sent as-is.
const ZERO_DECIMAL_CURRENCIES: SubscriptionPlan['currency'][] = ['JPY'];

const BILLING_CADENCE: Record<SubscriptionPlan['billing_interval'], string> = {
	month: 'MONTHLY',
	year: 'ANNUAL'
};

// Fields that live on the Square SUBSCRIPTION_PLAN_VARIATION's phase. Square
// does not allow a phase's cadence/pricing to be edited in place, so a change to
// any of these creates a new variation instead.
const VARIATION_FIELDS: (keyof SubscriptionPlan)[] = ['price', 'currency', 'billing_interval'];

type SquareCatalogResponse = {
	success: boolean;
	catalogObject?: { id: string; version?: string };
	error?: string;
};

const createSubscriptionPlansStore = () => {
	// ─── Core State ────────────────────────────────────────────────────────────
	const subscriptionPlans = writable<SubscriptionPlan[] | null>(null);
	const loading = writable(false);
	const error = writable<string | null>(null);

	let _supabase: SupabaseClient | null = null;
	let _channel: RealtimeChannel | null = null;

	// ─── Initializer ───────────────────────────────────────────────────────────
	const init = async (initialSubscriptionPlans: SubscriptionPlan[], supabase: SupabaseClient) => {
		cleanup();
		subscriptionPlans.set(initialSubscriptionPlans);
		_supabase = supabase;
		_setupRealtime();
		console.log(
			'Subscription plans store initialized with',
			initialSubscriptionPlans.length,
			'items'
		);
	};

	// ─── Realtime ──────────────────────────────────────────────────────────────
	const _setupRealtime = () => {
		if (!_supabase) return;
		_channel = getRealtimeChannel('subscription_plans') as RealtimeChannel;
		_channel
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'subscription_plans'
				},
				(payload: any) => {
					const current = get(subscriptionPlans);
					if (!current) return;
					if (payload.eventType === 'INSERT') {
						if (!current.find((i) => i.id === payload.new.id)) {
							subscriptionPlans.set([...current, payload.new]);
						}
					} else if (payload.eventType === 'UPDATE') {
						subscriptionPlans.set(current.map((i) => (i.id === payload.new.id ? payload.new : i)));
					} else if (payload.eventType === 'DELETE') {
						subscriptionPlans.set(current.filter((i) => i.id !== payload.old.id));
					}
				}
			)
			.subscribe();
	};

	// ─── Square Sync ───────────────────────────────────────────────────────────
	const _postSquareCatalog = async (
		endpoint: string,
		object: Record<string, unknown>
	): Promise<SquareCatalogResponse> => {
		try {
			return await fetch(`${baseUrl}${endpoint}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ catalogData: { idempotencyKey: uuidv4(), object } })
			}).then((res) => res.json());
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : String(e) };
		}
	};

	// Makes catalog objects unavailable for new subscriptions; existing Square
	// subscriptions on them keep billing.
	const _disableSquareCatalogObjects = async (
		objectIds: (string | null | undefined)[]
	): Promise<{ success: boolean; error?: string }> => {
		const ids = objectIds.filter((i): i is string => !!i);
		if (!ids.length) return { success: true };
		try {
			return await fetch(`${baseUrl}/api/square/catalog/disable`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ catalogData: { objectIds: ids } })
			}).then((res) => res.json());
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : String(e) };
		}
	};

	// Creates or updates the Square SUBSCRIPTION_PLAN and its
	// SUBSCRIPTION_PLAN_VARIATION, then saves the resulting Square IDs on the
	// Supabase row. Any missing Square object is (re)created, so calling this on
	// a plan whose earlier sync failed will repair it.
	const _syncToSquare = async (
		plan: SubscriptionPlan,
		{ syncPlan = true, syncVariation = true } = {}
	): Promise<{ success: boolean; subscriptionPlan: SubscriptionPlan; error?: string }> => {
		let squarePlanId = plan.square_plan_id ?? null;
		let squarePlanVariationId = plan.square_plan_variation_id ?? null;
		let squareError: string | undefined;

		// 1. Subscription plan
		if (syncPlan || !squarePlanId) {
			const { success, catalogObject, error: planError } = await _postSquareCatalog(
				squarePlanId ? '/api/square/catalog/upsert' : '/api/square/catalog/subscriptions/new',
				{
					type: 'SUBSCRIPTION_PLAN',
					id: squarePlanId ?? `#plan-${uuidv4()}`,
					subscriptionPlanData: {
						name: plan.name
					}
				}
			);
			if (success && catalogObject) {
				squarePlanId = catalogObject.id;
			} else {
				console.error('Error syncing Square subscription plan:', planError);
				squareError = planError ?? 'Error syncing Square subscription plan';
			}
		}

		// 2. Subscription plan variation (requires the plan's Square ID)
		if (!squareError && squarePlanId && (syncVariation || !squarePlanVariationId)) {
			const amount = Math.round(
				plan.price * (ZERO_DECIMAL_CURRENCIES.includes(plan.currency) ? 1 : 100)
			);
			const { success, catalogObject, error: variationError } = await _postSquareCatalog(
				'/api/square/catalog/upsert',
				{
					type: 'SUBSCRIPTION_PLAN_VARIATION',
					id: `#variation-${uuidv4()}`,
					subscriptionPlanVariationData: {
						name: plan.name,
						subscriptionPlanId: squarePlanId,
						phases: [
							{
								cadence: BILLING_CADENCE[plan.billing_interval],
								ordinal: 0,
								pricing: {
									type: 'STATIC',
									priceMoney: { amount, currency: plan.currency }
								}
							}
						]
					}
				}
			);
			if (success && catalogObject) {
				squarePlanVariationId = catalogObject.id;

				// The replaced variation stays in Square for its existing subscribers,
				// but is disabled so new subscriptions use the current pricing.
				const previousVariationId = plan.square_plan_variation_id;
				if (previousVariationId && previousVariationId !== squarePlanVariationId) {
					const { success: disableSuccess, error: disableError } =
						await _disableSquareCatalogObjects([previousVariationId]);
					if (!disableSuccess) {
						console.error('Error disabling previous Square plan variation:', disableError);
						squareError = disableError ?? 'Error disabling previous Square plan variation';
					}
				}
			} else {
				console.error('Error creating Square subscription plan variation:', variationError);
				squareError = variationError ?? 'Error creating Square subscription plan variation';
			}
		}

		// 3. Persist any new Square IDs (even on partial failure, so a retry doesn't
		// create a duplicate plan in Square).
		if (
			_supabase &&
			(squarePlanId !== (plan.square_plan_id ?? null) ||
				squarePlanVariationId !== (plan.square_plan_variation_id ?? null))
		) {
			const { data, error: err } = await _supabase
				.from('subscription_plans')
				.update({
					square_plan_id: squarePlanId,
					square_plan_variation_id: squarePlanVariationId
				})
				.eq('id', plan.id)
				.select()
				.single<SubscriptionPlan>();
			if (err) {
				console.error('Error saving Square IDs to subscription plan:', err.message);
				squareError = squareError ?? err.message;
			} else {
				plan = data;
				subscriptionPlans.update((current) =>
					current ? current.map((i) => (i.id === data.id ? data : i)) : [data]
				);
			}
		}

		return { success: !squareError, subscriptionPlan: plan, error: squareError };
	};

	// ─── Fetch Subscription Plans ──────────────────────────────────────────────
	const fetchSubscriptionPlans = async () => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase.from('subscription_plans').select('*');
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { success: false, error: err.message };
		}
		subscriptionPlans.set(data);
		return { success: true, subscriptionPlans: data };
	};

	// ─── CRUD ──────────────────────────────────────────────────────────────────
	const createSubscriptionPlan = async (
		item: Omit<
			SubscriptionPlan,
			'id' | 'created_at' | 'updated_at' | 'square_plan_id' | 'square_plan_variation_id'
		>
	) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('subscription_plans')
			.insert(item)
			.select()
			.single<SubscriptionPlan>();
		if (err) {
			loading.set(false);
			error.set(err.message);
			return { success: false, error: err.message };
		}
		subscriptionPlans.update((current) => (current ? [...current, data] : [data]));

		// Update Square:
		const {
			success: squareSuccess,
			subscriptionPlan,
			error: squareError
		} = await _syncToSquare(data);
		loading.set(false);

		if (!squareSuccess) {
			return { success: true, subscriptionPlan, error: squareError };
		}
		return { success: true, subscriptionPlan };
	};

	const updateSubscriptionPlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);
		const { data, error: err } = await _supabase
			.from('subscription_plans')
			.update(updates)
			.eq('id', id)
			.select()
			.single<SubscriptionPlan>();
		if (err) {
			loading.set(false);
			error.set(err.message);
			return { success: false, error: err.message };
		}
		subscriptionPlans.update((current) =>
			current ? current.map((i) => (i.id === id ? data : i)) : [data]
		);

		// Update Square:
		const {
			success: squareSuccess,
			subscriptionPlan,
			error: squareError
		} = await _syncToSquare(data, {
			syncPlan: 'name' in updates,
			syncVariation: VARIATION_FIELDS.some((field) => field in updates)
		});
		loading.set(false);

		if (!squareSuccess) {
			return { success: true, subscriptionPlan, error: squareError };
		}
		return { success: true, subscriptionPlan };
	};

	// Disables the plan and its variation in Square, then removes the Supabase
	// row. Square objects are disabled rather than deleted so existing Square
	// subscriptions keep working. If disabling fails the row is kept, so the Square
	// IDs aren't lost and the delete can be retried.
	const deleteSubscriptionPlan = async (id: string) => {
		if (!_supabase) return { error: 'Store not initialised' };
		loading.set(true);

		let plan = get(subscriptionPlans)?.find((i) => i.id === id);
		if (!plan) {
			const { data, error: fetchErr } = await _supabase
				.from('subscription_plans')
				.select('*')
				.eq('id', id)
				.single<SubscriptionPlan>();
			if (fetchErr) {
				loading.set(false);
				error.set(fetchErr.message);
				return { success: false, error: fetchErr.message };
			}
			plan = data;
		}

		// Update Square:
		const { success: squareSuccess, error: squareError } = await _disableSquareCatalogObjects([
			plan.square_plan_variation_id,
			plan.square_plan_id
		]);
		if (!squareSuccess) {
			loading.set(false);
			console.error('Error disabling Square subscription plan:', squareError);
			error.set(squareError ?? 'Error disabling Square subscription plan');
			return { success: false, error: squareError };
		}

		const { error: err } = await _supabase.from('subscription_plans').delete().eq('id', id);
		loading.set(false);
		if (err) {
			error.set(err.message);
			return { error: err.message };
		}
		subscriptionPlans.update((current) => (current ? current.filter((i) => i.id !== id) : null));
		return {
			success: true
		};
	};

	// Retries the Square sync for a plan whose Square IDs are missing (e.g. an
	// earlier create failed after the Supabase insert succeeded).
	const syncSubscriptionPlanToSquare = async (id: string) => {
		const plan = get(subscriptionPlans)?.find((i) => i.id === id);
		if (!plan) return { success: false, error: 'Subscription plan not found' };
		loading.set(true);
		const result = await _syncToSquare(plan, { syncPlan: false, syncVariation: false });
		loading.set(false);
		return result;
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
		subscriptionPlans,
		loading,
		error,
		init,
		fetchSubscriptionPlans,
		createSubscriptionPlan,
		updateSubscriptionPlan,
		deleteSubscriptionPlan,
		syncSubscriptionPlanToSquare,
		cleanup
	};
};

// Singleton — imported directly by any component that needs it
const _store = createSubscriptionPlansStore();
export const subscriptionPlansStore = _store;
export const subscriptionPlans = _store.subscriptionPlans;
export const loading = _store.loading;
export const error = _store.error;
export const fetchSubscriptionPlans = _store.fetchSubscriptionPlans;
export const createSubscriptionPlan = _store.createSubscriptionPlan;
export const updateSubscriptionPlan = _store.updateSubscriptionPlan;
export const deleteSubscriptionPlan = _store.deleteSubscriptionPlan;
export const syncSubscriptionPlanToSquare = _store.syncSubscriptionPlanToSquare;
export const initSubscriptionPlansStore = _store.init;
export const cleanupSubscriptionPlansStore = _store.cleanup;
