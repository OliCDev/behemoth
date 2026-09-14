<script lang="ts">

  // types
  import type { User } from "@supabase/supabase-js";
  // imports
  // props
  let {
    user = $bindable(),
    supabase = $bindable(),
    onsuccess = () => {},
    onerror = () => {}
  } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();
  // state
  // lifecycle
  // functions
</script>
<div id="tab-payment" class="flex flex-col gap-4 w-full lg:w-[80%] mt-10 mb-20">

  <div class="ctr-personal w-full flex flex-col lg:flex-row gap-4 mb-10">
    <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
      <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Payment Methods</h3>
    </div>
    <div class="w-full lg:w-3/4 flex flex-col">
    </div>
  </div>
</div>
