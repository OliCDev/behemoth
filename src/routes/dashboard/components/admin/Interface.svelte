<script lang="ts">
  // Types
  import type { User } from '@supabase/supabase-js';
  import type { Member } from '$lib/types/member';

  // Props
  let {
    user = $bindable(),
    supabase = $bindable(),
    members = $bindable()
  } = $props<{ user: User, supabase: any, members: Member[] }>();
    // onsuccess = () => {},
    // onerror = () => {}
  // } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();


  // Components
  import Students from './Students.svelte';

  const now = new Date();
	const admin_state = $state({
		error: '',
		success: '',
		loading: {
			leading: true,
			member: true
		},
		sections: {
		  students: {
				expanded: false
				},
			chambers: {
        expanded: false
        },
      events: {
        expanded: false
        },
      plans: {
        expanded: false
        }
		},
		deleting: {
			leading: false,
			member: false,
			modal_open: false,
			target_member_id: 0 as number | null
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
		member_search: {
			query: ''
		}
	});


	const toggleAdmin = async (member: Member) => {
		// Optimistically update UI — $state deeply tracks these mutations
		member.metadata.admin = !member.metadata.admin;
		let metadata = member.metadata;

		// console.log('metadata being sent to server for update: ', metadata);
		try {
			const result = await fetch(`/api/user/update/${member.user_id}`, {
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
			const response = await fetch(`/api/members/invites/new`, {
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
	type SectionKey = 'students' | 'chambers' | 'events' | 'plans';
	const toggle_expand = (sectionKey:SectionKey) => {
  (Object.keys(admin_state.sections) as SectionKey[]).forEach((key) => {
  		admin_state.sections[key].expanded = key === sectionKey ? !admin_state.sections[key].expanded : false;
  	});
	}
</script>

<div class="flex w-full flex-col gap-4 lg:flex-row xl:gap-2">
  <Students {user} {supabase} {members} expanded={admin_state.sections.students.expanded} toggleExpand={() => toggle_expand('students')} />
</div>
