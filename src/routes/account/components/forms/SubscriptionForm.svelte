<script lang="ts">

  // imports
  import type { SubscriptionPlan } from "$lib/types/subscription_plans";
  import {
		Label,
		Select,
	} from 'flowbite-svelte';
	import { countries } from '$lib/assets/data/countries';
	import { states } from '$lib/assets/data/states';

  // props
  let {
    subscriptionPlan = $bindable(),
    editing
  } = $props<{ subscriptionPlan: SubscriptionPlan, editing: boolean }>();

  // Helpers
 import { input_class } from '$lib/utils/style';
   // Jodit:
  const J = (globalThis as any).Jodit;
  let editorInstance: any = null;
  let descriptionEditorEl: HTMLTextAreaElement | null = null;

  const state = $state({
    jodit: {
     options: {
       placeholder: '',
       readonly: false,
       toolbar: true
     },
     content: { html: '', text: '' }
   },
  });

  // Functions
  const init_editor = async () => {
    if (editorInstance) {
      editorInstance.destruct();
      editorInstance = null;
    }
    console.log('Initializing Jodit editor...');

    if (!descriptionEditorEl) return;

    // We need to ignore this error because Jodit is global and loads:
    // @ts-ignore
    editorInstance = J?.make(descriptionEditorEl, {
      placeholder: '',
      readonly: false,
      toolbar: true,
      style: {
        'ul': 'list-style-type: disc; padding-left: 2rem;',
        'ol': 'list-style-type: decimal; padding-left: 2rem;',
        'li': 'display: list-item;'
      },
      extraCSS: `
          ul, ol {
            padding-left: 2rem;
            margin: 0.5rem 0;
          }
          ul {
            list-style-type: disc !important;
          }
          ol {
            list-style-type: decimal !important;
          }
          li {
            display: list-item !important;
          }
        `,
      buttons: [
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'ul', 'ol', '|',                          // <-- these are the list buttons
        'outdent', 'indent', '|',
        'font', 'fontsize', 'brush', '|',
        'paragraph', '|',
        'image', 'link', '|',
        'align', '|',
        'undo', 'redo', '|',
        'hr', 'eraser', 'copyformat', '|',
        'source'
      ],
      buttonsMD: ['bold', 'italic', '|', 'ul', 'ol', '|', 'paragraph', 'link'],
      buttonsSM: ['bold', 'italic', '|', 'ul', 'ol', '|', 'source'],
      buttonsXS: ['bold', '|', 'ul', 'ol', '|', 'source'],
      commandToHotkeys: {
        indent: 'tab', // Trigger indent command on Tab
        outdent: 'shift+tab' // Trigger outdent command on Shift+Tab
    },
      hotkeys: {
        'ctrl+b': 'bold',
        'ctrl+i': 'italic',
        'ctrl+u': 'underline',
        'ctrl+shift+s': 'strikethrough',
        'ctrl+shift+7': 'ul',
        'ctrl+shift+8': 'ol',
        'ctrl+shift+9': 'paragraph',
        'ctrl+k': 'link',
        'ctrl+shift+l': 'align',
        'ctrl+z': 'undo',
        'ctrl+y': 'redo'
      },
      events: {
        change(newValue: string) {
          state.jodit.content.html = newValue;
          subscriptionPlan.description = newValue;
        }
      }
    })

    editorInstance.value = state.jodit.content.html;
  }

  const destroy_editor = () => {
    if (editorInstance) {
      editorInstance.destruct();
      editorInstance = null;
    }
  };

  // Lifecycle
  import { onMount, onDestroy } from 'svelte';
  // Lifecycle
  onMount(() => {

    // Datepicker:
    state.jodit.content.html = subscriptionPlan.description || '';
    state.jodit.content.text = subscriptionPlan.description || '';

    init_editor();
  });

  onDestroy(() => {
    destroy_editor();
  });


 /* Shape:

 /*
 export type SubscriptionPlan = {
   id?: string | null;
   name: string;
   description: string;
   price: number;
   currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR';
   billing_interval: 'week' |'month' | 'year';
   start_date?: string | null;
   end_date?: string | null;
   square_plan_id?: string | null;
   square_plan_variation_id?: string | null;
   created_at?: string;
   updated_at?: string;
 }

 */

</script>

<div class="ctr-subscription_form w-full flex flex-col justify-start items-start">
  <div class="w-full flex flex-col mb-4 gap-4">
    <div class="w-full flex flex-col justify-start items-start gap-1">
      <Label>Name</Label>
      <input
        id="name"
        type="text"
        bind:value={subscriptionPlan.name}
        class={input_class}
      />
    </div>
    <div class="w-full flex flex-col justify-start items-start gap-1">
      <Label>Description</Label>
      <textarea
        bind:this={descriptionEditorEl}
        // bind:value={state.jodit.content.html}
        bind:value={subscriptionPlan.description}
      ></textarea>
    </div>
    <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
      <Label>Price</Label>
      <input
        id="price"
        type="number"
        bind:value={subscriptionPlan.price}
        class={input_class}
      />
    </div>
    <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
      <Label>Currency</Label>
      <Select
        id="currency"
        bind:value={subscriptionPlan.currency}
        class={input_class}
      >
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="CAD">CAD</option>
        <option value="AUD">AUD</option>
        <option value="JPY">JPY</option>
        <option value="CNY">CNY</option>
        <option value="INR">INR</option>
      </Select>
    </div>
    <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
      <Label>Billing Interval</Label>
      <Select
        id="billing_interval"
        bind:value={subscriptionPlan.billing_interval}
        class={input_class}
      >
        <option value="week">Week</option>
        <option value="month">Month</option>
        <option value="year">Year</option>
      </Select>
    </div>
  </div>
</div>

<style>

  :global(.jodit-container) { width: 100% !important; }
  :global(.ql-toolbar) {
    border: 1px solid rgba(209, 213, 219, 0.8);
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 0.375rem 0.375rem 0 0;
    padding: 0.5rem;
    gap: 0.25rem;
  }
</style>
