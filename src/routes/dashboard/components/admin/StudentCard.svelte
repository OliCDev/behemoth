<script lang="ts">
  // Types
  import type { Member } from '$lib/types/member';

  //Props
  let {
    student = $bindable(),
    selected = $bindable(),
    expanded = $bindable(),
    onselect,
    ondelete,
    onupdate,
    onaction
  } = $props<{
    student: Member,
    selected: boolean,
    expanded: boolean,
    onselect: (student: Member) => void,
    ondelete: (student: Member) => void,
    onupdate: (student: Member) => void,
    onaction: (student: Member) => void
  }>();

  // Utils
  import { card_class, checkbox_class } from '$lib/utils/style';

  // state
</script>

<div class={`w-full flex flex-row px-2 py-4 gap-4 justify-center items-center
  hover:bg-mist-800/10 hover:dark:bg-white/10
 ${selected  ? 'bg-mist-800/10 dark:bg-white/10' : ''}`}>
  <input type="checkbox" class={`w-4.5 h-4.5 mx-2 ${checkbox_class}`} bind:checked={selected} />
  <div class="flex flex-1 flex-row">
    <div class="h-9 w-9 rounded-lg bg-cover bg-center" style={`background-image: url('${ student.metadata.pfp }')`}></div>
    <div class="flex flex-col ml-2">
      <p class="text-neutral-800 dark:text-neutral-200">{student.metadata.first_name} {student.metadata.last_name}</p>
      <p class="text-neutral-600 dark:text-neutral-400 text-sm">{student.metadata.email}</p>
    </div>
  </div>
  <div class="ctr-member_overview flex flex-1"></div>
  <div class="ctr-more_info">
    <button aria-label="More information" class="cursor-pointer" onclick={() => {
      onaction(student);
      if(selected && !expanded) {
        onselect(student);
        selected = true
      } else if(!selected && expanded) {
        onselect(student);
        selected = true
      }
    }}>
      <i class="fa-solid fa-ellipsis-vertical text-neutral-800 dark:text-neutral-200"></i>
    </button>
  </div>
</div>
