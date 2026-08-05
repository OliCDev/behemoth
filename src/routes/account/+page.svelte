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
		Modal
	} from 'flowbite-svelte';
	import Dropzone from 'svelte-file-dropzone';

	// Utils
	import { containerClasses } from '$lib/utils/style';
	import { page } from '$app/stores';

	// Components
	import AddressForm from './components/AddressForm.svelte';

	// Data
	const supabase = $derived($page.data.supabase), user = $derived($page.data.user);
	import { countries } from '$lib/assets/data/countries';
	import { states } from '$lib/assets/data/states';
	// Debug:
	// svelte-ignore state_referenced_locally
	console.log('Account page - User:', user);
	// console.log('Account page - Supabase client:', supabase);

  // types

  // store
  import { getUserStore } from '$lib/stores/user.svelte';
	const userStore = getUserStore();

	// debug
	console.log('Account page - userStore - User:', userStore.appUser);
	console.log('Account page - userStore - User.addresses:', userStore.appUser?.addresses);

  // lifecycle
  import { onMount, onDestroy, tick } from 'svelte';
	import type { UserAddress } from '$lib/types/user';



  // state
  const default_pfp =
		'https://uqseuzmnwuthgorjvrdi.supabase.co/storage/v1/object/sign/img/Users/pfp_default.avif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iYTdiMWM0Zi0wNTYzLTRmZTQtYTA0Yy0wMmZiZWViYzYwOWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWcvVXNlcnMvcGZwX2RlZmF1bHQuYXZpZiIsImlhdCI6MTc2MzYxMTY0MywiZXhwIjoxNzk1MTQ3NjQzfQ.7f3p36JtVhzE3-5xeo5A9JlIizORlYAQxup3_R9Hayk';
  const pfp_state = $state<{
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

  account_state = $state({
  		success: '',
  		error: '',
  		current_tab: 'General',
  		tabs: [
  		  { name: 'General', href: '#', current: true },
        { name: 'Security', href: '#', current: false },
        { name: 'Payment Methods', href: '#', current: false }
  		],
      edit: {
        address: {
          open: false,
          item: null as UserAddress | null
        }
      },
      create: {
        address: {
          open: false,
          item: {
            id: null,
            user_id: userStore.appUser?.id || '',
            label: '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'USA'
          }
        }
      },
      delete:{
        address: {
          open: false,
          item: null as UserAddress | null
        }
      }

  	});




  let appUser = $state(userStore.appUser ?? null);
  let metadata_state = $state({
    username: '',
    email: '',
    pfp: default_pfp,
    first_name: '',
    last_name: '',
    phone_number: '',
    pronouns: '',
    admin: false,
    invitation: {
      token: '',
      email: '',
      accepted: false
    },
    reset_token: '',
    subscription_plan: {
      id: 1,
      name: 'Free',
      description: 'Free plan with limited features',
      price: 0,
      currency: 'USD',
      billing_interval: 'month',
      created_at: new Date().toISOString(),
    },
  })
  $effect(() => {
    if (userStore.appUser) {
      metadata_state.username = userStore.appUser.user_metadata.username || '';
      metadata_state.email = userStore.appUser.user_metadata.email || '';
      metadata_state.pfp = userStore.appUser.user_metadata.pfp_url || default_pfp;
      metadata_state.first_name = userStore.appUser.user_metadata.first_name || '';
      metadata_state.last_name = userStore.appUser.user_metadata.last_name || '';
      metadata_state.phone_number = userStore.appUser.user_metadata.phone_number || '';
      metadata_state.pronouns = userStore.appUser.user_metadata.pronouns || '';
      metadata_state.admin = userStore.appUser.user_metadata.admin || false;
      metadata_state.invitation = userStore.appUser.user_metadata.invitation || {
        token: '',
        email: '',
        accepted: false
      };
      metadata_state.reset_token = userStore.appUser.user_metadata.reset_token || '';
      metadata_state.subscription_plan = userStore.appUser.user_metadata.plan || {
        id: 1,
        name: 'Free',
        description: 'Free plan with limited features',
        price: 0,
        currency: 'USD',
        billing_interval: 'month',
        created_at: new Date().toISOString(),
      };
    }
  })

  // lifecycle
  onMount(async () => {
    console.log('Account page mounted. User:', user);
	});
	onDestroy(() => {
	  console.log('Account page destroyed.');
	});

  // functions
  // -- UI
  const input_class = "w-full rounded-md border border-slate-300 p-2 focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-400"
  const account_card_class = "w-full flex flex-col justify-start items-start gap-1 p-4 border border-neutral-100/20 rounded-md shadow-xl bg-linear-[80deg] from-slate-100 from-15% to-slate-200 bg-fixed lg:from-10% lg:to-60% dark:from-slate-400 dark:to-gray-900"
  const account_new_item_class = "w-full shadow-xl border border-dashed border-neutral-100/20 rounded-md flex flex-col justify-center items-center"
  // -- Profile Picture Upload
	const handle_pfp_drop = async (event: CustomEvent) => {
		pfp_state.pfp.posting = true;

		let files = {
			accepted: [],
			rejected: []
		};

		const { acceptedFiles, rejectedFiles } = event.detail;
		files.accepted = acceptedFiles;
		files.rejected = rejectedFiles;

		if (files.accepted.length > 0) {
			pfp_state.pfp.file = files.accepted[0];
		}
		pfp_state.pfp.posting = false;
		await tick();

		// upload to supabase storage
		const { data, error } = await supabase.storage
			.from('public_img')
			.upload(`/Users/${user?.id}/${pfp_state.pfp?.file?.name}`, pfp_state.pfp.file, {
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
		pfp_state.pfp.url = urlData.publicUrl || '';
		if(userStore.appUser) {
		  userStore.appUser.user_metadata.pfp_url = urlData.publicUrl || '';
		}

		// update user account with new pfp url
		await update_user_pfp();
	};
	const update_user_pfp = async () => {
		const result = await fetch('/api/user/update', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				pfp_url: pfp_state.pfp.url
			})
		});

		if (result.ok) {
			// console.log('Profile picture updated successfully!');
		} else {
			console.error('Error updating profile picture: ', result.statusText);
		}
	};
</script>

<div class={containerClasses}>
  <div class="bg-white/60 p-0 shadow-xl dark:bg-white/10 rounded-md flex flex-col justify-start items-center">
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
					{#if pfp_state.pfp.posting}
						<div class="flex w-full items-center justify-center p-4">
							<Spinner type="orbit" color="sky" />
						</div>
					{:else if pfp_state.pfp.file}
						<img
							src={URL.createObjectURL(pfp_state.pfp.file)}
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
      {#each account_state.tabs as tab}
        <button
          class="flex-1 lg:min-h-8.75 overflow-hidden py-2 text-center text-sm lg:text-md text-neutral-800 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          class:font-bold={account_state.current_tab === tab.name}
          onclick={() => (account_state.current_tab = tab.name)}
        >
          {tab.name}
        </button>
      {/each}
    </div>
  </div>
  <div class="bg-white/60 p-8 shadow-xl dark:bg-white/10 rounded-md">
    {#if account_state.current_tab === 'General'}
      <div class="flex flex-col gap-4 w-full lg:w-[80%] mt-10 mb-20">
        <!-- Personal -->
        <div class="ctr-personal w-full flex flex-col lg:flex-row gap-4 mb-10">
          <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
            <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Personal Information</h3>
          </div>
          <div class="w-full lg:w-3/4 flex flex-col">
            <div class="w-full flex flex-col lg:flex-row gap-4 mb-4">
              <div class="w-full lg:w-2/3 flex flex-col justify-start items-start gap-1">
                <Label>Username</Label>
                <input
                  id="username"
                  type="text"
                  bind:value={metadata_state.username}
                  class={`${input_class} mb-4`}
                />
              </div>
              <div class="w-full lg:w-1/3 flex flex-col justify-start items-start gap-1">
                <Label>Pronouns</Label>
                <input
                  id="pronouns"
                  type="text"
                  bind:value={metadata_state.pronouns}
                  class={`${input_class} mb-4`}
                />
              </div>
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
                  bind:value={metadata_state.phone_number}
                  class={input_class}
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="ctr-address w-full flex flex-col lg:flex-row gap-4 mb-4">
          <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
            <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Addresses</h3>
          </div>
          <div class="w-full lg:w-3/4">
            <div class="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#if userStore.appUser?.addresses && userStore.appUser.addresses.length > 0}
                {#each userStore.appUser.addresses as address, index}
                  <div class={account_card_class}>
                    <div class="w-full flex flex-row gap-2">
                      <div class="flex flex-1"></div>
                      <!-- Edit -->
                      <button
                        aria-label="Edit address"
                        class="text-neutral-600 dark:text-neutral-400 hover:text-sky-500 dark:hover:sky-red-400 cursor-pointer"
                        onclose={() => {
                          account_state.edit.address.open = false;
                          account_state.edit.address.item = null;
                        }}
                        onclick={() => {
                          account_state.edit.address.item = address;
                          account_state.edit.address.open = !account_state.create.address.open;
                        }}
                      >
                        <i class="fi fi-ss-edit text-sky-400 hover:text-sky-500"></i>
                      </button>
                      <Modal
                        bind:open={account_state.edit.address.open}
                        size="lg"
                      >
                        <div class="w-full flex flex-col justify-center items-start px-8 pb-8">
                          <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                            Edit "{account_state.edit.address.item?.label}"
                          </h3>
                          <hr class="w-full mb-8 h-px bg-slate-700 dark:bg-slate-300 border-t-slate-300  dark:border-t-slate-600 border-t ">
                          {#if account_state.edit.address.item}
                            <AddressForm address={account_state.edit.address.item} />
                          {/if}
                          <div class="w-1/2 mx-auto flex flex-row gap-4 justify-center items-center mt-4">
                            <button
                              class="rounded-md cursor-pointer bg-neutral-300 px-4 py-2 text-neutral-800 hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                              onclick={() => {
                                account_state.edit.address.open = false;
                                account_state.edit.address.item = null;
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              class="rounded-md cursor-pointer bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
                              onclick={() => {
                                account_state.edit.address.open = false;
                                account_state.edit.address.item = null;
                              }}
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </Modal>
                      <!-- Delete -->
                      <button
                        aria-label="Delete address"
                        class="text-neutral-600 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                        onclose={() => {
                          account_state.delete.address.open = false;
                          account_state.delete.address.item = null;
                        }}
                        onclick={() => {
                          account_state.delete.address.item = address;
                          account_state.delete.address.open = !account_state.delete.address.open;
                        }}>
                          <i class="fi fi-ss-trash  text-red-400 hover:text-red-500"></i>
                      </button>
                      <Modal
                        bind:open={account_state.delete.address.open}
                        size="md"
                      >
                        <div class="w-full flex flex-col justify-center items-center">
                          <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                            Delete "{account_state.delete.address.item?.label}"
                          </h3>
                          <p class="text-neutral-600 dark:text-neutral-400 m-0">
                            Are you sure you want to delete the address "{account_state.delete.address.item?.label}"?
                          </p>
                          <small class="text-neutral-600 dark:text-neutral-400 mx-0 mt-0 mb-4">This action cannot be undone.</small>
                          <div class="w-1/2 mx-auto flex flex-row gap-4 justify-center items-center mt-4">
                            <button
                              class="rounded-md cursor-pointer bg-neutral-300 px-4 py-2 text-neutral-800 hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                              onclick={() => {
                                account_state.delete.address.open = false;
                                account_state.delete.address.item = null;
                                account_state.delete.address.open = false;
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              class="rounded-md cursor-pointer bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                              onclick={() => {
                                userStore.appUser?.addresses?.splice(index, 1);
                                account_state.delete.address.open = false;
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </Modal>
                    </div>
                    <h4 class="text-neutral-800 dark:text-neutral-200 font-semibold">{address.label}</h4>
                    <p class="text-neutral-600 dark:text-neutral-400">{address.address_line1}</p>
                    <p class="text-neutral-600 dark:text-neutral-400">{address.address_line2}</p>
                    <p class="text-neutral-600 dark:text-neutral-400">{address.city}, {address.state} {address.postal_code}</p>
                    <p class="text-neutral-600 dark:text-neutral-400">{address.country}</p>
                  </div>
                {/each}
              {:else}
                <p class="text-neutral-600 dark:text-neutral-400">No addresses found.</p>
              {/if}
              <div class={account_new_item_class}>
                <button
                  aria-label="Add new address"
                  id="btn-add_new_address"
                  class="w-full h-full cursor-pointer min-h-37"
                  onclick={() => {
                    account_state.create.address.open = !account_state.create.address.open;
                  }}
                >
                  <i class="fi fi-ss-plus text-sky-400 hover:text-sky-500 text-2xl"></i>
                </button>
                <Tooltip triggeredBy="#btn-add_new_address">Add a new address</Tooltip>
                <Modal
                  bind:open={account_state.create.address.open}
                  size="lg"
                >
                  <div class="w-full min-h-37 flex flex-col justify-center items-start px-8 pb-8">
                    <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                      Add New Address
                    </h3>
                    <hr class="w-full mb-8 h-px bg-slate-700 dark:bg-slate-300 border-t-slate-300  dark:border-t-slate-600 border-t ">
                    <AddressForm address={account_state.create.address.item} />
                    <div class="w-1/2 mx-auto flex flex-row gap-4 justify-center items-center mt-4">
                      <button
                        class="rounded-md  cursor-pointer bg-neutral-300 px-4 py-2 text-neutral-800 hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                        onclick={() => {
                          account_state.create.address.open = false;
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        class="rounded-md cursor-pointer bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700"
                        onclick={() => {
                          if(userStore.appUser && account_state.create.address.item) {
                            userStore.appUser.addresses?.push(account_state.create.address.item);
                          }
                          account_state.create.address.open = false;
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
            </div>
          </div>
        </div>


        <!--

        Address form

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

                <Label>City</Label>
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
        </div> -->

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
    {:else if account_state.current_tab === 'Security'}
      <p>Security settings will go here.</p>
    {:else if metadata_state.current_tab === 'Payment Methods'}
      <p>Payment methods settings will go here.</p>
    {/if}
  </div>
</div>
