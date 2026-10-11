<script lang="ts">

  // types
  import type { User } from "@supabase/supabase-js";
  // imports
  // -- UI
  import { Label, Alert, Spinner, Tooltip } from 'flowbite-svelte';
  import { input_class, account_card_class, account_tab, account_new_item_class } from '$lib/utils/style';
  // props
  let {
    user = $bindable(),
    supabase = $bindable(),
    onsuccess = () => {},
    onerror = () => {}
  } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();
  // state
  const state = $state({})
  // lifecycle
  // functions
</script>
<div id="tab-payment" class={`${account_tab}`}>

  <div class="ctr-personal w-full flex flex-col lg:flex-row gap-4 mb-10">
    <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
      <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Subscription</h3>
    </div>
    <div class="w-full lg:w-3/4 flex flex-col">
      {#if user?.user_metadata?.admin}
        <!-- Subscription Management  -->
        <div class="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3  gap-4">
          <div class={account_new_item_class}>
            <button
              aria-label="Add new Subscription Plan"
              id="btn-add_new_subscription_plan"
              class="w-full h-full cursor-pointer min-h-37"
              onclick={() => {

              }}
            >
              <i class="fi fi-ss-plus text-amber-400 hover:text-amber-500 text-2xl"></i>
            </button>
            <Tooltip triggeredBy="#btn-add_new_subscription_plan">Add a new Subscription Plan</Tooltip>
          </div>

        </div>
        {:else}
        <!-- User upgrade/cancel -->
        <div class=""></div>
      {/if}
    </div>
  </div>
</div>
