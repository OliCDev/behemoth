<script lang="ts">

  // Props
  let {
    value = $bindable()
  } = $props<{ value: string }>();

  // Utils
  import { TelInput, countries } from 'svelte-tel-input';
  import type { CountryCode } from 'svelte-tel-input/types';
  import { input_class } from '$lib/utils/style';

  // State
  let phone_state = $state({
    country: 'US' as CountryCode | null,
    valid: true,
    selecting: false
  });

</script>



<div class="flex flex-col gap-1 w-full">
  <div class="w-full flex flex-row gap-1">
    <div class="w-2/5">
      <select bind:value={phone_state.country} aria-label="Country" class={input_class}>
        <option value={null}>US</option>
        {#each countries as c (c.id)}
          <option value={c.iso2}>{c.iso2} (+{c.dialCode})</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-1">
      <TelInput bind:country={phone_state.country} class={`${input_class}`} bind:value={value} bind:valid={phone_state.valid} />
    </div>
  </div>
  <div class="flex flex-col w-full">
    {#if !phone_state.valid}
      <p role="alert" class="text-red-500">Invalid phone number</p>
    {/if}
  </div>
</div>
