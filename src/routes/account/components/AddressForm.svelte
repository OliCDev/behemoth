<script lang="ts">

  // imports
  import type { UserAddress } from "$lib/types/user";
  import {
		Label,
		Select,
	} from 'flowbite-svelte';
	import { countries } from '$lib/assets/data/countries';
	import { states } from '$lib/assets/data/states';

  // props
  let {
    address = $bindable(),
    editing
  } = $props<{ address: UserAddress, editing: boolean }>();

  // Helpers
 import { input_class } from '$lib/utils/style';

</script>

<div class="ctr-address_form w-full  flex flex-col justify-start items-start   px-4">
  <div class="w-full flex flex-col mb-4 gap-4">
    <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
      <Label>Label</Label>
      <input
        id="address_line_1"
        type="address_line_1"
        bind:value={address.label}
        class={input_class}
      />
    </div>
    <div class="w-full flex flex-col justify-start items-start gap-1">
      <Label>Address line 1</Label>
      <input
        id="address_line_1"
        type="address_line_1"
        bind:value={address.address_line1}
        class={input_class}
      />
    </div>
    <div class="w-full flex flex-col justify-start items-start gap-1">
      <Label>Address line 2</Label>
      <input
        id="address_line_2"
        type="address_line_2"
        bind:value={address.address_line2}
        class={input_class}
      />
    </div>
  </div>
  <div class="w-full flex flex-col lg:flex-row gap-4 mb-4">
    <div class="w-full lg:w-2/5 flex flex-col justify-start items-start gap-1">
      <Label>City</Label>
      <input
        id="city"
        type="city"
        bind:value={address.city}
        class={input_class}
      />
    </div>
    <div class="w-full lg:w-2/5 flex flex-col justify-start items-start gap-1">
      {#if address.country === 'USA' }
        <Label>State</Label>
        <Select class={input_class} items={states} bind:value={address.state} />
      {:else}
        <Label>State/Province</Label>
        <input
          id="state"
          type="state"
          bind:value={address.state}
          class={input_class}
        />
      {/if}
    </div>
    <div class="w-full lg:w-1/5 flex flex-col justify-start items-start gap-1">

      <Label>Postal Code/Zip</Label>
      <input
        id="postal_code"
        type="zip"
        bind:value={address.postal_code}
        class={input_class}
      />
    </div>
  </div>
  <div class="w-full flex flex-col lg:flex-row gap-4">
    <div class="w-full flex flex-col justify-start items-start gap-1">
      <Label>
        Country
      </Label>
      <Select items={countries} bind:value={address.country} />
    </div>
  </div>
</div>
