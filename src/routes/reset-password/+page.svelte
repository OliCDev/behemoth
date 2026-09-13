<script lang="ts">
	// Svelte
	import { Alert } from 'flowbite-svelte';
	import { fade } from 'svelte/transition';
	import { Swords } from 'lucide-svelte'

	const reset_password_state = $state({
		password: '',
		confirm_password: '',
		success: '',
		error: '',
		resetting: false,
		token: ''
	});
	('');



	import { onMount } from 'svelte';
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		reset_password_state.token = urlParams.get('code') || '';
		console.log('Reset token: ', reset_password_state.token);
	});

	const resetPassword = async () => {
		reset_password_state.resetting = true;
		reset_password_state.success = '';
		reset_password_state.error = '';

		if (reset_password_state.password !== reset_password_state.confirm_password) {
			reset_password_state.error = 'Passwords do not match.';
			reset_password_state.resetting = false;
			return;
		}

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ password: reset_password_state.password, token: reset_password_state.token })
			});

			const result = await response.json();

			if (response.ok) {
				reset_password_state.success =
					'Password has been reset successfully! You can now <a href="/login"><strong>log in</strong> with your new password</a>.';
			} else {
				reset_password_state.error = result.error || 'Failed to reset password. Please try again.';
			}
		} catch (error) {
			reset_password_state.error = 'An unexpected error occurred. Please try again later.';
		} finally {
			reset_password_state.resetting = false;
		}
	};
</script>

<div class="flex h-screen w-full flex-col justify-center bg-mist-100 dark:bg-mist-900">
	<div
		class="align-center mx-auto flex w-96 flex-col justify-center rounded-lg bg-white p-8 shadow-xl dark:bg-mist-700"
	>
		<div class="flex flex-col">
  		<div class="mx-auto mb-4">
    		<Swords size={36}  color="red" strokeWidth={2} />
   	  </div>
			<p class="text-mist-800 dark:text-mist-200 text-center">
				Please enter your new password below to reset your account password.
			</p>
			<input
				name="password"
				bind:value={reset_password_state.password}
				type="password"
				placeholder="New Password"
				class="my-4 rounded-md border border-mist-300 p-2 focus:border-mist-500 focus:outline-none dark:border-mist-600 dark:bg-mist-800 dark:text-mist-200 dark:focus:border-mist-400"
			/>
			<input
				name="confirm_password"
				bind:value={reset_password_state.confirm_password}
				type="password"
				placeholder="Confirm New Password"
				class="mb-4 rounded-md border border-mist-300 p-2 focus:border-mist-500 focus:outline-none dark:border-mist-600 dark:bg-mist-800 dark:text-mist-200 dark:focus:border-mist-400"
			/>
			<button
				onclick={() => resetPassword()}
				disabled={reset_password_state.resetting}
				class="mt-2 cursor-pointer rounded-md bg-amber-600 p-2 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
			>
				{reset_password_state.resetting ? 'Resetting...' : 'Reset Password'}
			</button>
			<!-- Success/Error Messages -->
			{#if reset_password_state.success}
				<div in:fade out:fade={{ duration: 400 }}>
					<Alert color="green" class="mt-2">
						<span>{@html reset_password_state.success}</span>
					</Alert>
				</div>
			{/if}
			{#if reset_password_state.error}
				<div in:fade out:fade={{ duration: 400 }}>
					<Alert color="red" class="mt-2">
						<span>{reset_password_state.error}</span>
					</Alert>
				</div>
			{/if}
		</div>
	</div>
</div>
