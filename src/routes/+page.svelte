<script lang="ts">

  // Imports
  import { browser } from '$app/environment';
  import app_logo from '$lib/assets/img/app_logo.png';
	import app_logo_dark from '$lib/assets/img/app_logo_dark.png';
	import { Swords } from 'lucide-svelte'

	// State
 	// svelte-ignore non_reactive_update
 	let dark_mode : boolean = false;
  dark_mode = browser && window?.matchMedia && window?.matchMedia('(prefers-color-scheme: dark)').matches;


</script>

<div class="h-screen w-screen bg-mist-300 dark:bg-mist-900 flex flex-col justify-center items-center">
  <h1 class="text-2xl lg:text-8xl font-bold text-white mb-4 font-primary text-center">Behemoth Battle School</h1>
  <Swords size={36} color="red" strokeWidth={2} />
  <div class="w-full lg:w-1/3 mx-auto p-2 flex flex-row gap-2 justify-center items-center">
    <div class="flex"></div>
    <a href="/login" class="flex flex-row justify-center items-center my-8">
      <span class="text-mist-50 text-lg m-0 p-0">Login</span>
    </a>
    <!-- <span class="text-mist-50 text-lg m-0 p-0">|</span>
    <a href="/login?signup=true" class="flex flex-row justify-center items-center my-8">
      <span class="text-mist-50 text-lg m-0 p-0">Sign up</span>
    </a> -->
    <div class="flex"></div>
  </div>

</div>
