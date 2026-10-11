<script lang="ts">

  // Types
  import type { User } from "@supabase/supabase-js";
  import type { SubscriptionPlan } from "$lib/types/subscription_plans";

  // Imports
  // -- UI
  import { Label, Alert, Spinner, Tooltip, Modal } from 'flowbite-svelte';
  import {
    input_class,
    account_card_class,
    button_1,
    button_cancel,
    account_tab,
    account_new_item_class,
    modal_base_class,
    modal_body_class } from '$lib/utils/style';
  import SubscriptionForm from '../forms/SubscriptionForm.svelte';

  // Props
  let {
    user = $bindable(),
    supabase = $bindable(),
    subscription_plans = $bindable(),
    onsuccess = () => {},
    onerror = () => {}
  } = $props<{ user: User, supabase: any, subscription_plans: SubscriptionPlan[], onsuccess: () => void, onerror: () => void }>();
  // state

  const state = $state({
    create: {
      open: false,
      subscriptionPlan: {
        name: '',
        description: '',
        price: 0,
        currency: 'USD' as 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR',
        billing_interval: 'month',
        start_date: null as string | null,
        end_date: null as string | null
      }
    },
    update: {
      open: false,
      subscriptionPlan: {
        name: '',
        description: '',
        price: 0,
        currency: 'USD' as 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR',
        billing_interval: 'month',
        start_date: null as string | null,
        end_date: null as string | null
      }
    },
    delete: {
      open: false,
      subscriptionPlan: {

        id: null as string | null,
      }
    }
  })
  // lifecycle
  // functions
  const add_new_subscription_plan = async () => {}
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
                state.create.open = true;
              }}
            >
              <i class="fi fi-ss-plus text-amber-400 hover:text-amber-500 text-2xl"></i>
            </button>
            <Tooltip triggeredBy="#btn-add_new_subscription_plan">Add a new Subscription Plan</Tooltip>
            <Modal
              bind:open={state.create.open}
              size="md"
              class={modal_base_class}
              classes={{ body: modal_body_class}}
            >
              <div class="w-full flex flex-col justify-center items-start px-8 pb-8 ">
                <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                  Add new Subscription Plan
                </h3>
                <hr class="w-full mb-8 h-px bg-mist-700 dark:bg-mist-300 border-t-mist-300  dark:border-t-mist-600 border-t ">
                <SubscriptionForm bind:subscriptionPlan={state.create.subscriptionPlan} editing={true} />
                <div class="flex w-full flex-row gap-4 justify-end items-center mt-4">
                  <button
                    class={`${button_cancel}`}
                    onclick={() => {
                      state.create.open = false;
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    class={button_1}
                    onclick={add_new_subscription_plan}
                  >
                    Add Plan
                  </button>
                </div>
              </div>
            </Modal>
          </div>

        </div>
        {:else}
        <!-- User upgrade/cancel -->
        <div class=""></div>
      {/if}
    </div>
  </div>
</div>
