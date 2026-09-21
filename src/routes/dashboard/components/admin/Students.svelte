<script lang="ts">

  // Types
  import type { User } from '@supabase/supabase-js';
  import type { Member } from '$lib/types/member';

	// props:
	const {
	  user = $bindable(),
    supabase = $bindable(),
    members = $bindable(),
    expanded,
    toggleExpand
	} = $props<{
    user: User;
    supabase: any;
    members: Member[] | null;
		expanded: boolean;
		toggleExpand: () => void;
	}>();

	// imports
	import { slide } from 'svelte/transition';
	import { card_class, input_class } from '$lib/utils/style';

	// Components
	import StudentCard from './StudentCard.svelte';

	// Svelte
	import { onMount, onDestroy } from 'svelte';

	// store
	import { initMembersStore  } from '$lib/stores/members.svelte';

	// lifecycle
	onMount( async () => {
	  await initMembersStore(members, supabase);
	})
	// state
	const visibleStudents = $derived( members ?? []);
	const students_state = $state({
    error: '',
    success: '',
    loading: {
      leading: true,
      member: true
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

	let filteredStudents = (students: Member[]) => {
    const query = students_state?.member_search?.query?.toLowerCase();
    if (!query) return students.filter((student) => student.metadata.admin === false);
    return students.filter((student) => {
      return (
        student.metadata.admin === false && (
        student.metadata?.first_name?.toLowerCase().includes(query) ||
        student.metadata?.last_name?.toLowerCase().includes(query) ||
        student.metadata?.email?.toLowerCase().includes(query)
        )
      );
    });
  }
	console.log('Students component - visibleStudents:', filteredStudents(visibleStudents));

	// functions
	  const invite_new_student = async () => {}
		const delete_student = async (member: Member) => {}
		const toggle_student_admin = async (member: Member) => {}
		const update_student_metadata = async (member: Member, new_metadata: any) => {}
	</script>

	<div
		id="ctr-students"
		transition:slide={{ duration: 300 }}
		class={`${card_class + ( expanded ? ' w-full lg:w-full' : ' w-full lg:w-2/3 ')} h-[50vh] overflow-y-scroll flex flex-col items-start justify-start px-4 py-4 shadow-xl transition-all duration-300 xl:mx-2 `}
	>
	  <div class={`${expanded ? ' w-full lg:w-2/3' : ' w-full lg:w-full '}`}>
  	  <div class="ctr-student_search w-full flex flex-row justify-center items-center gap-2 mb-2">
  			<input type="search" class={`${input_class} w-full`} placeholder="Search students..." bind:value={students_state.member_search.query} />
  			<i class="fa-solid fa-magnifying-glass text-neutral-800 dark:text-neutral-200"></i>
  		</div>
      {#if !visibleStudents?.length}
        <p class="text-neutral-800 dark:text-neutral-200">Looks like there's no sudents signed up! :)</p>
  		{/if}

      <div class="w-full flex flex-col pt-4 rounded-md h-full">
        {#each filteredStudents(visibleStudents) as student (student.id)}
          <StudentCard
            {student}
            selected={false}
            {expanded}
            ondelete={() => {}}
            onupdate={() => {}}
            onselect={() => {}}
            onaction={() => {
              toggleExpand();
            }}
          />
        {/each}
      </div>
			</div>
		<div></div>
 </div>
