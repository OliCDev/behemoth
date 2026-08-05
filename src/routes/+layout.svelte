<script lang="ts">
	import '../app.css';
	import '../app.scss';
	import favicon from '$lib/assets/favicon.svg';
	// Fontsource

	import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

	let { children, data } = $props();

	// Access the current logged-in user and session
	const session = $derived(data.session);
	const supabase = $derived(data.supabase);
	const user = $derived(session?.user);

	// Store
	import { setUserStore } from '$lib/stores/user.svelte';
	// svelte-ignore state_referenced_locally
	const userStore = setUserStore(supabase, data.user)
	$effect(() => {
		userStore.load();
		const ch = userStore.subscribeRealtime(); return () => ch?.unsubscribe();
	});

	// Components
	import Navbar from '$lib/components/template/Navbar.svelte';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="align-center relative flex h-screen overflow-y-scroll w-full flex-col overflow-hidden bg-linear-[80deg] from-slate-100 from-45% to-slate-200 bg-fixed lg:from-40% dark:from-slate-900 dark:to-gray-900"
>
	{#if user}
		<Navbar {user} />
	{/if}
	<main>
		{@render children?.()}
	</main>
</div>
