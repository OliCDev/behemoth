<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

	// Types
	import type { User } from '@supabase/supabase-js';

	// Props
	const { user } = $props<{
		user: import('@supabase/supabase-js').User;
	}>();

	// Icons
	import { ArrowRightToBracketOutline } from 'flowbite-svelte-icons';

	// Components
	import { DarkMode, Tooltip } from 'flowbite-svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';

	// console.log('user in Navbar:', user);
	// console.log('navbar selectedPod:', selectedPod);
	// State
	let showMenu = $state(false);
	const default_pfp =
		'https://uqseuzmnwuthgorjvrdi.supabase.co/storage/v1/object/sign/img/Users/pfp_default.avif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iYTdiMWM0Zi0wNTYzLTRmZTQtYTA0Yy0wMmZiZWViYzYwOWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWcvVXNlcnMvcGZwX2RlZmF1bHQuYXZpZiIsImlhdCI6MTc2MzYxMTY0MywiZXhwIjoxNzk1MTQ3NjQzfQ.7f3p36JtVhzE3-5xeo5A9JlIizORlYAQxup3_R9Hayk';

	const dark_mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	import app_logo from '$lib/assets/img/app_logo.png';
	import app_logo_dark from '$lib/assets/img/app_logo_dark.png';

	// Functions
	const logout = async () => {
		// post to /api/auth/signout endpoint:
		const response = await fetch('/api/auth/signout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (response.ok) {
			console.log('User signed out successfully');
			// Redirect to home page:
			window.location.href = '/';
		} else {
			console.error('Failed to sign out');
		}
	};

	// Close menu on navigation
	onMount(() => {
		beforeNavigate(() => {
			showMenu = false;
		});
	});
</script>

<nav>
<div
	id="navbar-mobile"
	class="visible fixed bottom-0 z-50 flex w-full flex-row items-center justify-center bg-slate-200 px-6 py-2 lg:invisible dark:bg-slate-800"
>
	<div class="align-center flex flex-1 items-center justify-center gap-6">
		<a href="/dashboard" aria-label="Dashboard" title="Dashboard">
			<div
				class="-mt-1.5 h-8 w-8 rounded-full"
				style={`background-image: url(${dark_mode ? app_logo_dark : app_logo}); background-size: contain; background-position: center; background-repeat: no-repeat;`}
			></div>
		</a>



		{#if user}
			<div></div>
		{/if}
	</div>
	<div class="flex flex-1"></div>
	<button onclick={() => (showMenu = !showMenu)}>
		{#if user}
			<div
				class="my-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-300 bg-cover bg-center"
				style={`background-image: url(${user?.user_metadata?.pfp_url || default_pfp});`}
			>
				<!-- {#if user?.user_metadata?.pfp_url}
					<img src={user?.user_metadata?.pfp_url} alt="profile " class="h-8 w-8 rounded-full" />
				{:else}
					<img
						src={default_pfp}
						alt="User default"
						class="h-8 w-8 rounded-full"
					/>
				{/if} -->
			</div>
		{/if}
	</button>

	{#if showMenu}
		<div
			in:fade
			out:fade={{ duration: 400 }}
			class="absolute right-5 bottom-18 flex w-[40vw] flex-col rounded-lg bg-slate-300/90 p-4 text-neutral-800 dark:bg-slate-800/90 dark:text-neutral-200"
		>
			<div class="flex w-full flex-row items-center justify-end">
				Light/Dark

				<DarkMode />
			</div>
			<div class="mb-1 flex w-full flex-row items-center justify-end px-2">
				<a href="/account">
					Account
					<i class="fi fi-ss-user ms-2 me-1"></i>
				</a>
			</div>
			<div class="flex w-full flex-row items-center justify-end">
				<button
					class="btn flex cursor-pointer flex-row text-neutral-800 dark:text-neutral-200"
					onclick={logout}
				>
					Sign out
					<ArrowRightToBracketOutline
						class="mx-2 h-6 w-6 shrink-0 text-neutral-800 dark:text-neutral-200"
					/>
				</button>
			</div>
		</div>
	{/if}
</div>

<div
	id="navbar-desktop"
	class="align-center invisible fixed top-0 left-0 flex h-full w-18.75 flex-col justify-center gap-4 bg-linear-to-b
    from-slate-200 to-slate-100 p-4 lg:visible dark:from-slate-800 dark:to-slate-900
  "
>
	<div class="mt-8 flex flex-col items-center py-4">
		<a href="/dashboard" aria-label="Dashboard" title="Dashboard" class="mb-8" id="link-dashboard">
			<div
				class="h-15 w-15 rounded-full bg-contain bg-center bg-no-repeat"
				style={`background-image: url(${dark_mode ? app_logo_dark : app_logo});`}
			></div>
			<Tooltip placement="bottom" triggeredBy="#link-dashboard">Dashboard</Tooltip>
		</a>




	</div>
	<div class="flex flex-1"></div>
	<div class="align-center align-center flex flex-col items-center py-4">
		<div class="cursor-pointer p-2">
			<DarkMode class="cursor-pointer" />
		</div>
		<a href="/account" id="link-account">
			<div
				class="my-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-300 bg-cover bg-center"
				style={`background-image: url(${user?.user_metadata?.pfp_url || default_pfp});`}
			></div>
			<Tooltip triggeredBy="#link-account">Account</Tooltip>
		</a>
		<!-- Signout -->
		<button class="btn mt-4 cursor-pointer text-neutral-800 dark:text-neutral-200" onclick={logout}>
			<ArrowRightToBracketOutline class="h-6 w-6 shrink-0 text-neutral-800 dark:text-neutral-200" />
		</button>
	</div>
</div>
</nav>
