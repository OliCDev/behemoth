<script lang="ts">
	// Svelte
	import { Alert } from 'flowbite-svelte';
	import { fade } from 'svelte/transition';

	const forgot_password_state = $state({
		email: '',
		success: '',
		error: '',
		sending: false
	});

	const sendPasswordResetLink = async () => {
		forgot_password_state.sending = true;
		forgot_password_state.success = '';
		forgot_password_state.error = '';

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: forgot_password_state.email })
			});

			const result = await response.json();

			if (response.ok) {
				forgot_password_state.success = 'Password reset link sent! Please check your email.';
			} else {
				forgot_password_state.error =
					result.error || 'Failed to send reset link. Please try again.';
			}
		} catch (error) {
			forgot_password_state.error = 'An unexpected error occurred. Please try again later.';
		} finally {
			forgot_password_state.sending = false;
		}
	};
</script>

<div class="flex h-[100vh] w-full flex-col justify-center bg-indigo-100 dark:bg-indigo-900">
	<div
		class="align-center mx-auto flex w-96 flex-col justify-center rounded-lg bg-white p-8 shadow-xl dark:bg-gray-700"
	>
		<div class="flex flex-col">
			<p class="text-neutral-700 dark:text-neutral-300">
				Forgot your password? No worries! Enter your email below to receive a password reset link.
			</p>
			<input
				name="email"
				bind:value={forgot_password_state.email}
				type="email"
				placeholder="Email"
				class="my-4 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
			/>
			<button
				class="mt-2 cursor-pointer rounded-md bg-sky-600 p-2 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
				disabled={forgot_password_state.sending}
				onclick={() => sendPasswordResetLink()}
			>
				{forgot_password_state.sending ? 'Sending...' : 'Send Reset Link'}
			</button>
			<!-- Success/Error Messages -->
			{#if forgot_password_state.success}
				<div in:fade out:fade={{ duration: 400 }}>
					<Alert color="green" class="mt-2">
						<span>{forgot_password_state.success}</span>
					</Alert>
				</div>
			{/if}
			{#if forgot_password_state.error}
				<div in:fade out:fade={{ duration: 400 }}>
					<Alert color="red" class="mt-2">
						<span>{forgot_password_state.error}</span>
					</Alert>
				</div>
			{/if}
		</div>
	</div>
</div>
