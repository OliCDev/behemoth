<script lang="ts">

  // imports
  import {
		Alert,
		Tabs,
		TabItem,
		Tooltip,
		Spinner,
		Label,
		Select,
		label
	} from 'flowbite-svelte';
	import Dropzone from 'svelte-file-dropzone';

	import { page } from '$app/stores';

	// Data
	const supabase = $derived($page.data.supabase), user = $derived($page.data.user);
	import { countries } from '$lib/assets/data/countries';
	import { states } from '$lib/assets/data/states';
	// Debug:
	console.log('Account page - User:', user);
	// console.log('Account page - Supabase client:', supabase);

  // types

  // store

  // lifecycle
  import { onMount, tick } from 'svelte';

  // state
  const default_pfp =
		'https://uqseuzmnwuthgorjvrdi.supabase.co/storage/v1/object/sign/img/Users/pfp_default.avif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iYTdiMWM0Zi0wNTYzLTRmZTQtYTA0Yy0wMmZiZWViYzYwOWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWcvVXNlcnMvcGZwX2RlZmF1bHQuYXZpZiIsImlhdCI6MTc2MzYxMTY0MywiZXhwIjoxNzk1MTQ3NjQzfQ.7f3p36JtVhzE3-5xeo5A9JlIizORlYAQxup3_R9Hayk';
  const state = $state<{
		pfp: {
			posting: boolean;
			url: string;
			file: File | null;
		};
	}>({
		pfp: {
			posting: false,
			url: '',
			file: null
		}
	}),

  metadata_state = $state({
		username: '',
		first_name: '',
		last_name: '',
		pronouns: '',
		pfp_url: '',
		admin: false,
		email: '',
		phone: '',
		address: {
		  line_1: '',
			line_2: '',
			city: '',
			state: '',
			zip: '',
			country: ' '
		},
		success: '',
		error: '',
		current_tab: 'General',
		tabs: [
		  { name: 'General', href: '#', current: true },
      { name: 'Security', href: '#', current: false },
      { name: 'Payment Methods', href: '#', current: false }
		]
	});

  // lifecycle
  onMount(async () => {
		if (user) {
			metadata_state.username = user?.user_metadata.username;
			metadata_state.first_name = user?.user_metadata.first_name;
			metadata_state.last_name = user?.user_metadata.last_name;
			metadata_state.pronouns = user?.user_metadata.pronouns;
			metadata_state.pfp_url = user?.user_metadata.pfp_url;
			metadata_state.admin = user?.user_metadata.admin;
			metadata_state.email = user?.user_metadata.email;
			metadata_state.phone = user?.user_metadata.phone;
			metadata_state.address = user?.user_metadata.address || {
        line_1: '',
        line_2: '',
        city: '',
        state: 'AL',
        zip: '',
        country: 'USA'
      };
		}
	});

  // functions
  // -- UI
  const input_class = "w-full rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
  // -- Profile Picture Upload
	const handle_pfp_drop = async (event: CustomEvent) => {
		state.pfp.posting = true;

		let files = {
			accepted: [],
			rejected: []
		};

		const { acceptedFiles, rejectedFiles } = event.detail;
		files.accepted = acceptedFiles;
		files.rejected = rejectedFiles;

		if (files.accepted.length > 0) {
			state.pfp.file = files.accepted[0];
		}
		state.pfp.posting = false;
		await tick();

		// upload to supabase storage
		const { data, error } = await supabase.storage
			.from('public_img')
			.upload(`/Users/${user?.id}/${state.pfp?.file?.name}`, state.pfp.file, {
				cacheControl: '3600',
				upsert: true
			});

		if (error) {
			console.error('Error uploading profile picture: ', error);
			return;
		}
		// console.log('Profile picture uploaded: ', data);
		// get public url
		const { data: urlData, error: urlError } = supabase.storage
			.from('public_img')
			.getPublicUrl(data.path);
		if (urlError) {
			console.error('Error getting public url: ', urlError);
			return;
		}
		// console.log('Public URL: ', urlData.publicUrl);
		state.pfp.url = urlData.publicUrl || '';
		metadata_state.pfp = urlData.publicUrl || '';
		// update user account with new pfp url
		// await update_user_pfp();
	};
	const update_user_pfp = async () => {
		const result = await fetch('/api/user/update', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				pfp: state.pfp.url
			})
		});

		if (result.ok) {
			// console.log('Profile picture updated successfully!');
		} else {
			console.error('Error updating profile picture: ', result.statusText);
		}
	};
</script>

<div class="w-full lg:w-2/3 mx-auto mt-20 h-screen  flex flex-col gap-4 p-4">
  <div class="bg-white/60 p-0 shadow-xl dark:bg-white/10 rounded-md flex flex-col justify-start items-center overflow-hidden">
    <div class="w-full flex flex-col md:flex-row pt-4 lg:pt-8 px-4 lg:px-8">
      <div class="h-30 w-30 flex flex-col justify-start items-center md:mb-8">
        <Dropzone
					id="upload_pfp"
					on:drop={handle_pfp_drop}
					class="flex w-full h-full cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-sky-400 bg-white bg-cover bg-center dark:bg-neutral-800"
					accept="image/*"
					maxFiles={1}
					style={`background-image: url(${user?.user_metadata?.pfp_url || default_pfp}); background-size: cover; background-position: center;`}
				>
					{#if state.pfp.posting}
						<div class="flex w-full items-center justify-center p-4">
							<Spinner type="orbit" color="sky" />
						</div>
					{:else if state.pfp.file}
						<img
							src={URL.createObjectURL(state.pfp.file)}
							alt="Profile preview"
							class="h-full w-full object-cover"
						/>
					{:else if user?.user_metadata?.pfp_url}
						<img
							src={user?.user_metadata?.pfp_url || default_pfp}
							alt="Profile"
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="text-center text-neutral-600 dark:text-neutral-300">
							Upload a new picture
						</div>
					{/if}
					<Tooltip triggeredBy="#upload_pfp"
						>Click to upload a profile picture. Select a square image for best results.</Tooltip
					>
				</Dropzone>
      </div>
      <div class="flex flex-col p-4 justify-center items-start ">
        <h3 class="text-neutral-800 dark:text-neutral-200">{ user?.user_metadata?.first_name } { user?.user_metadata?.last_name }</h3>
        <h4 class="text-slate-700 dark:text-slate-400">{user?.user_metadata?.email }</h4>
      </div>
    </div>
    <div class="flex flex-row w-full border-t-slate-300  dark:border-t-slate-600 border-t overflow-hidden">
      {#each metadata_state.tabs as tab}
        <button
          class="flex-1 overflow-hidden py-2 text-center text-sm lg:text-md text-neutral-800 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          class:font-bold={metadata_state.current_tab === tab.name}
          onclick={() => (metadata_state.current_tab = tab.name)}
        >
          {tab.name}
        </button>
      {/each}
    </div>
  </div>
  <div class="bg-white/60 p-6 shadow-xl dark:bg-white/10 rounded-md">
    {#if metadata_state.current_tab === 'General'}
      <div class="flex flex-col gap-4 w-full lg:w-[70%] mx-auto mt-10 mb-20">
        <!-- Personal -->
        <div class="ctr-personal w-full flex flex-col lg:flex-row gap-4 mb-10">
          <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
            <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Personal Information</h3>
          </div>
          <div class="w-full lg:w-3/4 flex flex-col">
            <div class="w-full lg:w-2/3 flex flex-col justify-start items-start gap-1">
              <Label>Username</Label>
              <input
                id="username"
                type="text"
                bind:value={metadata_state.username}
                class={`${input_class} mb-4`}
              />
            </div>
            <div class="w-full flex flex-col lg:flex-row gap-4 mb-4">
              <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
                <Label>First Name</Label>
                <input
                  id="first_name"
                  type="text"
                  bind:value={metadata_state.first_name}
                  class={input_class}
                />
              </div>
              <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
                <Label>Last Name</Label>
                <input
                  id="last_name"
                  type="text"
                  bind:value={metadata_state.last_name}
                  class={input_class}
                />
              </div>
            </div>
            <div class="w-full flex flex-col lg:flex-row gap-4">
              <div class="w-full lg:w-3/5 flex flex-col justify-start items-start gap-1">
                <Label>Email</Label>
                <input
                  id="email"
                  type="email"
                  bind:value={metadata_state.email}
                  class={input_class}
                />
              </div>
              <div class="w-full lg:w-2/5 flex flex-col justify-start items-start gap-1">
                <Label>Phone number</Label>
                <input
                  id="phone"
                  type="phone"
                  bind:value={metadata_state.phone}
                  class={input_class}
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="ctr-address w-full flex flex-col lg:flex-row gap-4 mb-4">
          <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
            <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Address</h3>
          </div>
          <div class="w-full lg:w-3/4">
            <div class="w-full flex flex-col mb-4 gap-4">
              <div class="w-full flex flex-col justify-start items-start gap-1">
                <Label>Address line 1</Label>
                <input
                  id="address_line_1"
                  type="address_line_1"
                  bind:value={metadata_state.address.line_1}
                  class={input_class}
                />
              </div>
              <div class="w-full flex flex-col justify-start items-start gap-1">
                <Label>Address line 2</Label>
                <input
                  id="address_line_2"
                  type="address_line_2"
                  bind:value={metadata_state.address.line_2}
                  class={input_class}
                />
              </div>
            </div>
            <div class="w-full flex flex-col lg:flex-row gap-4 mb-4">
              <div class="w-full lg:w-2/5 flex flex-col justify-start items-start gap-1">
                <!-- svelte-ignore component_name_lowercase -->
                <label for="city" class="text-neutral-800 dark:text-neutral-200 font-thin text-sm">City</label>
                <input
                  id="city"
                  type="city"
                  bind:value={metadata_state.address.city}
                  class={input_class}
                />
              </div>
              <div class="w-full lg:w-2/5 flex flex-col justify-start items-start gap-1">
                {#if metadata_state.address.country === 'USA' }
                  <Label>State</Label>
                  <Select items={states} bind:value={metadata_state.address.state} />
                {:else}
                  <Label>State/Province</Label>
                  <input
                    id="state"
                    type="state"
                    bind:value={metadata_state.address.state}
                    class={input_class}
                  />
                {/if}
              </div>
              <div class="w-full lg:w-1/5 flex flex-col justify-start items-start gap-1">
                <!-- svelte-ignore component_name_lowercase -->
                <label for="zip" class="text-neutral-800 dark:text-neutral-200 font-thin text-sm">Zip</label>
                <input
                  id="zip"
                  type="zip"
                  bind:value={metadata_state.address.zip}
                  class={input_class}
                />
              </div>
            </div>
            <div class="w-full flex flex-col lg:flex-row gap-4">
              <div class="w-full flex flex-col justify-start items-start gap-1">
                <Label>
                  Country
                </Label>
                <Select items={countries} bind:value={metadata_state.address.country} />
              </div>
            </div>
          </div>
        </div>

        <!-- Save Changes -->
        <div class="ctr-save_changes w-full flex flex-col lg:flex-row gap-4">
          <div class="flex flex-1"></div>
          <div class="w-full lg:w-3/4">
            <button
              class="rounded-md cursor-pointer w-full bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
              onclick={() => console.log('Save changes clicked')}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    {:else if metadata_state.current_tab === 'Security'}
      <p>Security settings will go here.</p>
    {:else if metadata_state.current_tab === 'Payment Methods'}
      <p>Payment methods settings will go here.</p>
    {/if}
  </div>
</div>
