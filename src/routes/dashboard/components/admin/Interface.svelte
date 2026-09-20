<script lang="ts">


  // Types
  import type { User } from '@supabase/supabase-js';

  // Props
  let {
    user = $bindable(),
    supabase = $bindable(),
  } = $props<{ user: User, supabase: any  }>();
    // onsuccess = () => {},
    // onerror = () => {}
  // } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();

  const now = new Date();
	const admin_state = $state({
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
	// Functions
	const clock = () => {
		setInterval(() => {
			const now = new Date();
			admin_state.clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
									.includes(admin_state.friend_search.query.toLowerCase())
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
		admin_state.invite.sending = true;
		try {
			const response = await fetch(`/api/friends/invites/new`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: admin_state.invite.email,
					invited_by: user?.id,
					invited_by_name: user?.user_metadata?.first_name ?? 'A warrior'
				})
			});
			const data = await response.json();
			if (data.success) {
				admin_state.invite.status.success = 'Invite sent successfully!';
				admin_state.invite.email = '';
				admin_state.invite.sending = false;
				admin_state.invite.cta = 'Send Another';

				// // delay
				// setTimeout(() => {
				// 	admin_state.invite.modal_open = false;
				// 	admin_state.invite.status.success = '';
				// 	admin_state.invite.sending = false;
				// }, 500);
			} else {
				admin_state.invite.status.error =
					data.error || 'Failed to send invite. Please try again.';
				admin_state.invite.sending = false;
			}
		} catch (error) {
			console.error('Error inviting member:', error);
			admin_state.invite.status.error = 'Failed to send invite. Please try again.';
		}
	};

</script>
