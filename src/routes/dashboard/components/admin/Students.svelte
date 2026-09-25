<script lang="ts">

  // Types
  import type { User } from '@supabase/supabase-js';
  import type { Member } from '$lib/types/member';


  // UI
  import { Tooltip, Modal, toggle } from 'flowbite-svelte';
  import { slide } from 'svelte/transition';
  // Utils
	import { card_class, input_class, modal_base_class, modal_body_class } from '$lib/utils/style';



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



	// Components
	import StudentCard from './StudentCard.svelte';
	import PhoneInput from '$lib/components/global/PhoneInput.svelte';

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
      first_name: '',
      last_name: '',
      phone_number: '',
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
		class={`${card_class + ( expanded ? ' w-full lg:w-full' : ' w-full lg:w-2/3 ')} h-[50vh] overflow-y-scroll flex flex-row items-start justify-start px-4 py-4 shadow-xl transition-all duration-300 xl:mx-2 `}
	>
	  <div class={`${expanded ? ' w-full lg:w-2/3' : ' w-full lg:w-full '}`}>
  	  <div class="ctr-student_search w-full flex flex-row justify-center items-center gap-2 mb-2">
  			<input type="search" class={`${input_class} w-full`} placeholder="Search students..." bind:value={students_state.member_search.query} />
  			<i class="fa-solid fa-magnifying-glass text-neutral-800 dark:text-neutral-200"></i>
        <div class="ctr-add">
          <button
            id="add-new-student"
            aria-label="Invite new student"
            class="px-2 py-1 rounded-md cursor-pointer bg-mist-800 text-white hover:bg-mist-700 dark:bg-white dark:text-neutral-800 dark:hover:bg-neutral-200"
            onclick={() => {
              students_state.invite.modal_open = !students_state.invite.modal_open;
              toggleExpand();
            }}>
            <i class="fa-solid fa-plus"></i>
          </button>
          	<Tooltip triggeredBy="#add-new-student">Add new student</Tooltip>
           <!-- <Modal bind:open={students_state.invite.modal_open}
             size="md"
             class="bg-neutral-100 dark:bg-neutral-800">
               <div></div>
             </Modal> -->
            </div>
  		</div>
      {#if !visibleStudents?.length}
        <p class="text-neutral-800 dark:text-neutral-200">Looks like there's no sudents signed up! Let's invite some new warriors.</p>
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
		<div class={`ctr-student-detail ${ expanded ? ' w-full lg:w-1/3 h-full  ' : '' } px-2 pb-4 pt-2 lg:pt-0 lg:px-4 flex flex-col `}>
		  {#if students_state.invite.modal_open}
        <div class="w-full h-full flex flex-col justify-start items-start gap-4 {card_class}">
          <p class="text-neutral-800 dark:text-neutral-200">Invite new student</p>
          <div class="w-full flex flex-row gap-2">
            <div class="w-full lg:w-1/2">
              <input type="text" class={`${input_class} w-full`} placeholder="First name" bind:value={students_state.invite.first_name} />
            </div>
            <div class="w-full lg:w-1/2">
              <input type="text" class={`${input_class} w-full`} placeholder="Last name" bind:value={students_state.invite.last_name} />
            </div>

          </div>
          <div class="w-full">
            <input type="email" class={`${input_class} w-full`} placeholder="Email" bind:value={students_state.invite.email} />
          </div>
          <div class="w-full lg:w-4/5 flex flex-col">
            <PhoneInput bind:value={students_state.invite.phone_number} />
          </div>
          <button
            class="px-4 py-2 rounded-md bg-mist-800 text-white hover:bg-mist-700 dark:bg-white dark:text-neutral-800 dark:hover:bg-neutral-200"
            onclick={() => {
              invite_new_student();
            }}
          >
            {students_state.invite.cta}
          </button>
        </div>
      {/if}
		</div>
 </div>
