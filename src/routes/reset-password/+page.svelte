<script lang="ts">
	// Svelte
	import { Alert } from 'flowbite-svelte';
	import { fade } from 'svelte/transition';

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
					'Password has been reset successfully! You can now log in with your new password.';
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

<div class="flex h-[100vh] w-full flex-col justify-center bg-indigo-100 dark:bg-indigo-900">
	<div
		class="align-center mx-auto flex w-96 flex-col justify-center rounded-lg bg-white p-8 shadow-xl dark:bg-slate-700"
	>
		<div class="flex flex-col">
			<p class="text-slate-800 dark:text-slate-200">
				Please enter your new password below to reset your account password.
			</p>
			<input
				name="password"
				bind:value={reset_password_state.password}
				type="password"
				placeholder="New Password"
				class="my-4 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
			/>
			<input
				name="confirm_password"
				bind:value={reset_password_state.confirm_password}
				type="password"
				placeholder="Confirm New Password"
				class="mb-4 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
			/>
			<button
				onclick={() => resetPassword()}
				disabled={reset_password_state.resetting}
				class="mt-2 cursor-pointer rounded-md bg-sky-600 p-2 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
			>
				{reset_password_state.resetting ? 'Resetting...' : 'Reset Password'}
			</button>
			<!-- Success/Error Messages -->
			{#if reset_password_state.success}
				<div in:fade out:fade={{ duration: 400 }}>
					<Alert color="green" class="mt-2">
						<span>{reset_password_state.success}</span>
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
