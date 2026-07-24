<script lang="ts">
	// Server
	// export let data;

	// imports
	// import { PUBLIC_API_URL } from '$env/static/public';
	// import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	// Svelte
	import { Alert } from 'flowbite-svelte';
	import { fade } from 'svelte/transition';

	// form data from server
	let { form } = $props<{ form?: any }>();

	// error handlign and stuff
	$effect(() => {
		if (form?.username) {
			login_state.user_creds.username = form.username;
		}
	});

	// State
	const login_state = $state({
		user_creds: {
			username: '',
			password: '',
			confirm_password: '',
			email: '',
			pfp_url:
				'https://res.cloudinary.com/dxsjva9e0/image/upload/v1761835316/user_avatar_ry4fdr.png'
		},
		logged_in: false,
		signup_mode: false,
		posting: false,
		success: '',
		error: '',
		invitation: {
			token: '',
			email: ''
		}
	});

	// Lifecycle
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	$effect(() => {
		const token = page.url.searchParams.get('invitation_token');
		const email = page.url.searchParams.get('email');
		if (token?.length && email?.length) {
			untrack(() => {
				login_state.signup_mode = true;
				login_state.invitation.token = token;
				login_state.invitation.email = email;
				login_state.user_creds.email = email;
				console.log('Invitation detected:', { token, email });
			});
		}
	});

	// Branding
	import app_logo from '$lib/assets/img/tapp_logo.png';
	const app_name = 'BehemothBikes';

	const signIn = async () => {
		login_state.signup_mode = false;
		console.log('Signing in user...');
		try {
			const res = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: login_state.user_creds.email,
					password: login_state.user_creds.password
				})
			});
			const data = await res.json();
			if (data.success) {
				let res = await data.user;
				login_state.error = '';
				login_state.success =
					 `Welcome back, ${data?.user?.user_metadata?.username ?? 'biker'}!`;

				/* {user?.user_metadata?.first_name
				? user?.user_metadata?.first_name
				: firstName(user?.user_metadata?.full_name || '')}! */
				login_state.logged_in = true;
				// console.log('User signed in:', data);
				// save to locals or store as needed

				// // Small delay to ensure cookies are set, then reload
				setTimeout(() => {
					if (login_state.success?.length) {
						window.location.href = '/dashboard';
					}
				}, 100);
			} else {
				login_state.error = data.error || 'Failed to sign in.';
			}
		} catch (error) {
			// I hate this so, so, so damn much.

			let err = String(error);
			console.log('err string:', err);
			if (!err?.includes(`TypeError: Cannot read properties of undefined (reading 'split')`)) {
				login_state.error = `An error occurred during sign in: ${error}`;
			} else {
				login_state.success = 'Welcome back, biker!';
				login_state.logged_in = true;
				window.location.href = '/dashboard';
			}
		} finally {
			// window.location.href = '/dashboard';
			login_state.posting = false;
		}
	};

	const signUp = async () => {
		login_state.signup_mode = true;

		console.log(`Signing up user: ${login_state.user_creds.username}`);
		if (login_state.user_creds.password !== login_state.user_creds.confirm_password) {
			login_state.error = 'Passwords do not match.';
			return;
		}
		if (
			!login_state.user_creds.username ||
			!login_state.user_creds.password ||
			!login_state.user_creds.confirm_password ||
			!login_state.user_creds.email
		) {
			login_state.error = 'Please fill in all fields.';
			return;
		}

		// Clear previous messages
		const clear = () => {
			login_state.error = '';
			login_state.success = '';
			login_state.posting = true;
		};

		clear();
		if (!login_state.invitation.token?.length) {
			login_state.error =
				'No invitation token found. Please use the invite link sent to your email.';
			return;
		} else {
			try {
				const res = await fetch('/api/auth/signup', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(login_state.user_creds)
				});
				const data = await res.json();
				if (data.success) {
					console.log('Friend signed up!', data?.user);

					// Accept invitation if present
					if (login_state.invitation.token) {
						try {
							const invitationRes = await fetch('/api/friends/invites/accept', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									token: login_state.invitation.token,
									invited_email: login_state.invitation.email
								})
							});
							const invitationData = await invitationRes.json();
							if (invitationData.success) {
								console.log('Invitation accepted:', invitationData);
							} else {
								console.error('Failed to accept invitation:', invitationData.error);
							}
						} catch (invitationError) {
							console.error('Error accepting invitation:', invitationError);
						}
					}

					// Check if email confirmation is required
					if (data.requiresEmailConfirmation) {
						login_state.success =
							data.message ||
							`Please check your email to confirm your ${app_name} account! (Also check your spam folder, sometimes our emails can be a bit shy)`;
						login_state.logged_in = false;
					} else {
						login_state.success = 'Welcome!';
						login_state.logged_in = true;
						login_state.error = '';

						// Small delay to ensure cookies are set, then reload
						setTimeout(() => {
							window.location.href = '/dashboard';
						}, 100);
					}
				} else {
					login_state.error = data.error || 'Failed to sign up.';
				}
			} catch (error) {
				login_state.error = 'An error occurred during sign up.';
			} finally {
				login_state.posting = false;
			}
		}
	};

	const randomNameGenerator = () => {
		const adjectives = ['Swift', 'Silent', 'Mighty', 'Brave', 'Clever'];
		const animals = ['Tiger', 'Eagle', 'Shark', 'Panther', 'Wolf'];
		const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
		const animal = animals[Math.floor(Math.random() * animals.length)];
		return `${adjective}${animal}`;
	};

	// snip full name into first name only:
	const snip_name = (full_name: string) => {
		return full_name.split(' ')[0];
	};

	const detect_signup_mode = () => {
		const urlParams = new URLSearchParams(window.location.search);
		const signup_mode = urlParams.get('signup');
		if (signup_mode) {
			login_state.signup_mode = true;
		}
	};
</script>

<!-- Tailwind gradient bg -->
<div
	class="dark:from-indego-800 flex h-screen w-full flex-col justify-center bg-linear-to-tr from-indigo-100 via-white to-indigo-100 dark:via-indigo-900 dark:to-black"
>
	<div
		class="align-center mx-auto flex w-[90vw] flex-col justify-center rounded-lg bg-white p-8 shadow-xl md:w-120 dark:bg-indigo-900"
	>
		<img src={app_logo} alt="" />
		{#if login_state.signup_mode}
			<div class="flex flex-col">
				<input
					name="username"
					bind:value={login_state.user_creds.username}
					onkeydown={(e) => {
						login_state.error = '';
					}}
					type="text"
					placeholder={`Username (e.g. ${randomNameGenerator()})`}
					class="mb-2 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
				/>
				<input
					name="email"
					bind:value={login_state.user_creds.email}
					onkeydown={(e) => {
						login_state.error = '';
					}}
					type="email"
					placeholder="Email"
					class="mb-2 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
				/>

				<input
					name="password"
					bind:value={login_state.user_creds.password}
					onkeydown={(e) => {
						login_state.error = '';
					}}
					type="password"
					placeholder="Password"
					class="mb-2 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
				/>
				<input
					name="confirm_password"
					bind:value={login_state.user_creds.confirm_password}
					onkeydown={(e) => {
						login_state.error = '';
					}}
					type="password"
					placeholder="Please confirm your password"
					class="mb-2 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
				/>
				<button
					onclick={signUp}
					class="mt-4 cursor-pointer rounded-md bg-orange-600 p-2 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
				>
					Sign In
				</button>

				<!-- Success/Error Messages -->
				{#if login_state.success}
					<div in:fade out:fade={{ duration: 400 }}>
						<Alert color="green" class="mt-2">
							<span>{login_state.success}</span>
						</Alert>
					</div>
				{/if}
				{#if login_state.error}
					<div in:fade out:fade={{ duration: 400 }}>
						<Alert color="red" class="mt-2">
							<span>{login_state.error}</span>
						</Alert>
					</div>
				{/if}
			</div>
			<div class="flex w-full flex-col text-center">
				<p class="mt-4 text-slate-600 dark:text-slate-300">
					Already have an account?
					<button
						class="cursor-pointer text-slate-800 underline hover:text-slate-600 dark:text-slate-200 dark:hover:text-slate-400"
						onclick={() => (login_state.signup_mode = false)}
					>
						Sign in
					</button>
				</p>
			</div>
		{:else}
			<div class="flex flex-col">
				<input
					name="email"
					bind:value={login_state.user_creds.email}
					type="text"
					placeholder="Email"
					onkeydown={(e) => {
						login_state.error = '';
					}}
					class="mb-2 rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
				/>
				<input
					name="password"
					bind:value={login_state.user_creds.password}
					type="password"
					placeholder="Password"
					class="cursor-pointer rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
					onkeydown={(e) => {
						login_state.error = '';
						if (e.key === 'Enter') {
							signIn();
						}
					}}
				/>
				<button
					onclick={signIn}
					class="mt-4 cursor-pointer rounded-md bg-orange-600 p-2 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
				>
					Sign In
				</button>
				<!-- Server-side Error Messages from form action -->
				<!-- {#if login_state.error}
					<div in:fade out:fade={{ duration: 400 }}>
						<Alert color="red" class="mt-2">
							<span>{login_state.error}</span>
						</Alert>
					</div>
				{/if} -->
				<!-- Client-side Success/Error Messages -->
				{#if login_state.success}
					<div in:fade out:fade={{ duration: 400 }}>
						<Alert color="green" class="mt-2">
							<span>{login_state.success}</span>
						</Alert>
					</div>
				{/if}
				{#if login_state.error}
					<div in:fade out:fade={{ duration: 400 }}>
						<Alert color="red" class="mt-2">
							<span>{login_state.error}</span>
						</Alert>
					</div>
				{/if}
			</div>
			<div class="flex w-full flex-col text-center">
				<p class="mt-4 text-slate-600 dark:text-slate-300">
					Don't have an account? Reach out to K.
				</p>
				<p class="mt-2 text-xs text-slate-600 dark:text-slate-300">
					Forgot your password? No worries!
					<a
						href="/forgot-password"
						class="cursor-pointer text-slate-800 underline hover:text-slate-600 dark:text-slate-200 dark:hover:text-slate-400"
					>
						Reset here.
					</a>
				</p>
			</div>
		{/if}
	</div>
</div>
