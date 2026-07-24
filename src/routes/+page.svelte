<script lang="ts">


 	const dark_mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	import app_logo from '$lib/assets/img/app_logo.png';
	import app_logo_dark from '$lib/assets/img/app_logo_dark.png';
</script>

<div class="h-screen w-screen bg-slate-600 flex flex-col justify-center items-center">
  <h1 class="text-8xl font-bold text-white mb-4">Behemoth Bikes</h1>
  <a href="/login" class="mx-auto flex flex-row justify-center items-end">
    <span class="text-slate-50 text-lg m-0 p-0">Login</span>
    <div
				class="h-8 w-8 mx-2 rounded-full bg-contain bg-center bg-no-repeat"
				style={`background-image: url(${dark_mode ? app_logo_dark : app_logo});`}
			></div>
  </a>

</div>
