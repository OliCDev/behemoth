<script lang="ts">
	// Svelte
	import { Alert, select } from 'flowbite-svelte';
	import { fade } from 'svelte/transition';

	// Types
	import type { User } from '@supabase/supabase-js';
	import type { Friend } from '$lib/types/friends';

	// Components
	import { Modal, Toggle, Spinner, Tooltip } from 'flowbite-svelte';
	import FriendCard from './components/FriendCard.svelte';

	// Utils
	import { containerClasses } from '$lib/utils/style';

	// form data from server and layout data
	let { data } = $props<{ data?: any }>();

	// Access user and profile from layout data
	const user = $derived(data?.user),
		friends = $derived(data?.friends);

	// Debug:
	// svelte-ignore state_referenced_locally
	console.log('Dashboard - User:', user);
	// console.log('Dashboard - Friends:', friends);

	const app_name = 'Behemoth Bikes';

	// Stores

	// State
	const now = new Date();
	const dashboard_state = $state({
		error: '',
		success: '',
		clock: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
		loading: {
			leading: true,
			member: true
		},
		deleting: {
			leading: false,
			member: false,
			modal_open: false,
			target_friend_id: 0 as number | null
		},
		invite: {
			modal_open: false,
			email: '',
			cta: 'Send Invite',
			status: {
				success: '',
				error: ''
			},
			sending: false
		},
		friend_search: {
			query: ''
		}
	});

	// Log when user is available
	$effect(() => {
		if (user) {
			// console.log('Dashboard - User:', user);
			// console.log('Dashboard - Friends:', friends);
		}
	});

	// Ignore type error:
	// @ts-ignore - Supabase types don't work well with Svelte's reactivity
	let friendSearchResults = $state<Friend[]>(
		// svelte-ignore state_referenced_locally
		friends
			? friends.map((friend: Friend) => ({
					id: friend.id,
					username: friend?.username || friend?.member || 'Unknown',
					pfp: friend?.pfp || '/default_pfp.png',
					admin: friend?.admin || false,
					metadata: friend?.metadata || {
						pronouns: '',
						admin: false,
						email: '',
						pfp: '/default_pfp.png',
						username: friend?.username || friend?.member || 'Unknown'
					},
					member: friend?.member || null
				}))
			: []
	);

	$effect(() => {
		// sync friendSearchResults when server data reloads
		if (friends) {
			friendSearchResults = friends.map((friend: Friend) => ({
				id: friend.id,
				username: friend?.username || friend?.member || 'Unknown',
				pfp: friend?.pfp || '/default_pfp.png',
				admin: friend?.admin || false,
				metadata: friend?.metadata || {
					pronouns: '',
					admin: false,
					email: '',
					pfp: '/default_pfp.png',
					username: friend?.username || friend?.member || 'Unknown'
				},
				member: friend?.member || null
			}));
		}
	});

	// Functions
	const clock = () => {
		setInterval(() => {
			const now = new Date();
			dashboard_state.clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}, 1000);
	};
	clock();

	const searchFriends = () => {
		friendSearchResults = friends
			? friends
					.filter((friend: Friend) =>
						friend.username
							? friend.username
									.toLowerCase()
									.includes(dashboard_state.friend_search.query.toLowerCase())
							: false
					)
					.map((friend: Friend) => ({
						id: friend.id,
						username: friend?.username || friend?.member || 'Unknown',
						pfp: friend?.pfp || '/default_pfp.png',
						admin: friend?.admin || false,
						metadata: friend?.metadata || {
							pronouns: '',
							admin: false,
							email: '',
							pfp: '/default_pfp.png',
							username: friend?.username || friend?.member || 'Unknown'
						},
					}))
			: [];
	};
	const toggleAdmin = async (friend: Friend) => {
		// Optimistically update UI — $state deeply tracks these mutations
		friend.metadata.admin = !friend.metadata.admin;
		friend.admin = friend.metadata.admin;
		let metadata = friend.metadata;

		// console.log('metadata being sent to server for update: ', metadata);
		try {
			const result = await fetch(`/api/user/update/${friend.member}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ metadata })
			});
			const data = await result.json();
			console.log('User account updated: ', data?.success);
		} catch (error) {
			console.error('Error updating user account: ', error);
		}
	};
	const sendInvite = async () => {
		dashboard_state.invite.sending = true;
		try {
			const response = await fetch(`/api/friends/invites/new`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: dashboard_state.invite.email,
					invited_by: user?.id,
					invited_by_name: user?.user_metadata?.first_name ?? 'A biker'
				})
			});
			const data = await response.json();
			if (data.success) {
				dashboard_state.invite.status.success = 'Invite sent successfully!';
				dashboard_state.invite.email = '';
				dashboard_state.invite.sending = false;
				dashboard_state.invite.cta = 'Send Another';

				// // delay
				// setTimeout(() => {
				// 	dashboard_state.invite.modal_open = false;
				// 	dashboard_state.invite.status.success = '';
				// 	dashboard_state.invite.sending = false;
				// }, 500);
			} else {
				dashboard_state.invite.status.error =
					data.error || 'Failed to send invite. Please try again.';
				dashboard_state.invite.sending = false;
			}
		} catch (error) {
			console.error('Error inviting member:', error);
			dashboard_state.invite.status.error = 'Failed to send invite. Please try again.';
		}
	};
	const deleteFriend = (friendId: number) => {
		// Optimistically update UI
		friendSearchResults = friendSearchResults.filter(
			(friend: Friend) => Number(friend.id) !== Number(friendId)
		);

		try {
			fetch(`/api/user/delete/${friendId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (error) {
			console.error('Error removing friend:', error);
		}
	};
</script>

<div
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 200 }}
	class={containerClasses}
>
	<div
		id="greetbox"
		class="mx-auto mt-8 flex w-full flex-col rounded-lg bg-white/60 p-6 shadow-xl dark:bg-white/10"
	>
		<h1
			class="mx-2 mt-6 text-3xl font-bold text-neutral-600 md:text-6xl lg:text-9xl dark:text-neutral-200"
		>
			Hello,
			<span class="lowercase">{user?.user_metadata?.first_name || 'biker'}!</span>
		</h1>
		<p class="m-2 text-2xl font-thin text-neutral-600 md:text-6xl dark:text-neutral-200">
			{dashboard_state.clock}
		</p>
	</div>
	<div class="flex flex-col lg:flex-row gap-4">
		<div
			id="dashboard-main"
			class=" mx-auto flex   w-full  flex-col gap-4 rounded-lg bg-white/60 px-2 py-4 shadow-xl md:p-6 dark:bg-white/10"
			transition:fade={{ duration: 200 }}
		>
			{#if user?.user_metadata?.admin}
				<div id="dashboard-main-row" class="flex w-full flex-row">

				</div>
			{:else}
			<div class="align-center my-auto flex flex-col items-center justify-center p-4">
				<p class="text-center text-xl text-neutral-600 dark:text-neutral-200">
				  Welcome to the {app_name} dashboard.
				</p>
			</div>
		{/if}
		</div>

	</div>
</div>
