<script lang="ts">

  // types
  import type { User } from "@supabase/supabase-js";
  // imports
  import { Label, Alert } from 'flowbite-svelte';
  import { button_1, button_cancel, input_class } from '$lib/utils/style';
  // props
  let {
    user = $bindable(),
    supabase = $bindable(),
    onsuccess = () => {},
    onerror = () => {}
  } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();
  // state
  const security_state = $state({
    error: '',
    success: '',
    initial_success: false,
    data: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
  })
  // lifecycle
  // functions
  const save_changes = async () => {
    check_current_password();
    if (security_state.data.new_password !== security_state.data.confirm_password) {
      security_state.error = 'New password and confirm password do not match.';
      return;
    }
    const { data, error } = await supabase.auth.updateUser({
      password: security_state.data.new_password
    });
    if (error) {
      security_state.error = error.message;
      return;
    }
    security_state.success = 'Password updated successfully.';
    security_state.error = '';
    onsuccess();
  }
  const check_current_password = async () => {
    if (!security_state.data.current_password) {
      security_state.error = 'Current password is required.';
      security_state.initial_success = false;
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: security_state.data.current_password
    });
    if (error) {
      security_state.error = 'Current password is incorrect.';
      security_state.initial_success = false;
      return;
    }
    security_state.error = '';
    security_state.initial_success = true;
  }
</script>
<div id="tab-security" class="flex flex-col gap-4 w-full lg:w-[80%] mt-10 mb-20">

  <!-- Password Update -->
  <div class="ctr-personal w-full flex flex-col lg:flex-row gap-4 mb-10">
    <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
      <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Update Password</h3>
    </div>
    <div class="w-full lg:w-3/4 flex flex-col">
      {#if security_state.error}
        <Alert color="red" class="mb-4">
          <span>{security_state.error}</span>
        </Alert>
      {/if}
      <div class="w-full flex flex-col mb-4 gap-4">
        <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1 mb-4">
          <Label>Current Password</Label>
          <input
            id="current_password"
            type="password"
            bind:value={security_state.data.current_password}
            class={input_class}
            oninput={() => {
              security_state.error = ''
              security_state.success = ''
            }}
          />
        </div>
        <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
          <Label>New Password</Label>
          <input
            id="password"
            type="password"
            bind:value={security_state.data.new_password}
            class={input_class}
            oninput={() => {
              security_state.error = ''
              security_state.success = ''
            }}
          />
        </div>
        <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
          <Label>Confirm New Password</Label>
          <input
            id="confirm_password"
            type="password"
            bind:value={security_state.data.confirm_password}
            class={input_class}
            oninput={() => {
              security_state.error = ''
              security_state.success = ''
            }}
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Save Changes -->
  <div class="ctr-save_changes w-full flex flex-col lg:flex-row gap-4">
    <div class="flex flex-1"></div>
    <div class="w-full lg:w-3/4">
      <button
        class={`${ security_state.error.length > 0 && security_state.data.new_password !== security_state.data.confirm_password  ? button_cancel + ' cursor-not-allowed' : button_1 + ' cursor-pointer'  }`}
        onclick={() => {
          save_changes();
        }}
        disabled={ security_state.error.length > 0 || security_state.data.new_password !== security_state.data.confirm_password}
      >
        Update Account
      </button>
    </div>
  </div>
</div>
