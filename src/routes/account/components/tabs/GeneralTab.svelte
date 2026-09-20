<script lang="ts">

  // imports
  import {
		Alert,
		Tooltip,
		Label,
		Modal,
		Toast, ToastContainer, P, Button, Heading
	} from 'flowbite-svelte';
	import { fly } from "svelte/transition";
	import { Swords } from "lucide-svelte"

	// Utils

	// Components
	import AddressForm from '../AddressForm.svelte';

	// Data
	// const supabase = $derived($page.data.supabase), user = $derived($page.data.user);

	// Debug:
	// svelte-ignore state_referenced_locally
	// console.log('Account page - User:', user);
	// console.log('Account page - Supabase client:', supabase);

  // types
  import type { User } from '@supabase/supabase-js';
  import type { MemberAddress, MemberMetadata } from '$lib/types/member';
  // Props
  let {
    user = $bindable(),
    supabase = $bindable(),
    onsuccess = () => {},
    onerror = () => {}
  } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();


  // store
  import { member, fetchMember } from '$lib/stores/member.svelte';


	// console.log('Account page - member:', $member);


  // lifecycle
  import { onMount, onDestroy, tick } from 'svelte';





  // state

  const general_state = $state({
  		success: '',
  		error: '',
      edit: {
        address: {
          open: false,
          item: null as MemberAddress | null
        }
      },
      create: {
        address: {
          open: false,
          item: {
            id: null,
            user_id: $member?.id || '',
            label: '',
            primary: false,
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
          item: null as MemberAddress | null
        }
      }

  	});

  // Stores:
  import {
    addressesStore,
    addresses as userAdresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddress
  } from '$lib/stores/addresses.svelte';


  // const addresses = addressesStore.fetchAddressesByUser(memberStore.Member?.id || '');
  let visibleAddresses = $derived($userAdresses ?? []);
  // console.log('Account page - visibleAddresses:', visibleAddresses);


  // console.log('Account page - Member:', Member);
  const default_pfp =
		'https://uqseuzmnwuthgorjvrdi.supabase.co/storage/v1/object/sign/img/Users/pfp_default.avif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iYTdiMWM0Zi0wNTYzLTRmZTQtYTA0Yy0wMmZiZWViYzYwOWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWcvVXNlcnMvcGZwX2RlZmF1bHQuYXZpZiIsImlhdCI6MTc2MzYxMTY0MywiZXhwIjoxNzk1MTQ3NjQzfQ.7f3p36JtVhzE3-5xeo5A9JlIizORlYAQxup3_R9Hayk';

  let meta = $state({
    data: {
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
      }
    } as MemberMetadata ,
    success: '',
    error: ''
  })

  let hydrated = false;
  $effect(() => {

    if ($member && !hydrated) {
      hydrated = true;
      // console.log('effect member:', $member);
      meta.data.username = $member.user_metadata.username || '';
      meta.data.email = $member.user_metadata.email || '';
      meta.data.pfp = $member.user_metadata.pfp_url || default_pfp;
      meta.data.first_name = $member.user_metadata.first_name || '';
      meta.data.last_name = $member.user_metadata.last_name || '';
      meta.data.phone_number = $member.user_metadata.phone_number || '';
      meta.data.pronouns = $member.user_metadata.pronouns || '';
      meta.data.admin = $member.user_metadata.admin || false;
      meta.data.invitation = $member.user_metadata.invitation || {
        token: '',
        email: '',
        accepted: false
      };
      meta.data.reset_token = $member.user_metadata.reset_token || '';
      meta.data.subscription_plan = $member.user_metadata.plan || {
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

	onDestroy(() => {
	  console.log('General Tab destroyed.');
	});

  // functions
  // -- UI
  const input_class = "w-full rounded-md border border-mist-300 p-2 focus:border-mist-500 focus:outline-none dark:border-mist-600 dark:bg-mist-800 dark:text-mist-200 dark:focus:border-mist-400"
  const account_card_class = "w-full flex flex-col justify-start items-start p-4 border border-neutral-100/20 rounded-md shadow-xl bg-linear-[80deg] from-mist-100 from-15% to-mist-300 bg-fixed lg:from-30% lg:to-70% dark:from-mist-900 dark:to-mist-600"
  const account_new_item_class = "w-full shadow-xl border border-dashed border-neutral-100/20 rounded-md flex flex-col justify-end items-end"
  const modal_base_class = "rounded-lg bg-white shadow-xl dark:bg-mist-900"
  const modal_body_class = "space-y-0 p-6"
  // -- Profile Picture Upload
  //
  import { button_1, button_cancel } from '$lib/utils/style';

	const update_user_account = async () => {
		try {
			const result = await fetch('/api/user/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(meta.data)
			});
			// console.log('User account updated: ', result);
			if(!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.message || 'Error updating user account');
      } else {
        general_state.success = 'User updated successfully!';
  			general_state.error = '';
        let res = await result.json();
        console.log('User account updated successfully: ', res  );

        onsuccess("green", general_state.success);
  			await tick();
        // Sync the freshly persisted auth metadata into the store so other
        // views (navbar, account header) reflect the change without a reload.
        if (res?.user?.user_metadata) {
          member.update((m) =>
            m
              ? {
                  ...m,
                  user_metadata: res.user.user_metadata,
                  metadata: { ...m.metadata, ...res.user.user_metadata }
                }
              : m
          );
        }
        meta.data = res?.user?.user_metadata
  			setTimeout(() => {
  				meta.success = '';
  			}, 3000);
      }

		}
		  catch (error) {
  			console.error('Error updating user account: ', error);
  			general_state.error = 'Error updating user account!';
  			general_state.success = '';

        onerror("red", general_state.error);
  			await tick();
  			setTimeout(() => {
  				meta.error = '';
  			}, 3000);
			}
	};

	// -- Address CRUD
	const reset_create_address = () => {
		general_state.create.address.item = {
			id: null,
			user_id: user.id || '',
			label: '',
			primary: false,
			address_line1: '',
			address_line2: '',
			city: '',
			state: '',
			postal_code: '',
			country: 'USA'
		};
	};

	const flash = async (message: string, ok = true) => {
		if (ok) {
			general_state.success = message;
			general_state.error = '';
		} else {
			general_state.error = message;
			general_state.success = '';
		}
		await tick();
		setTimeout(() => {
			general_state.success = '';
			general_state.error = '';
		}, 3000);
	};

	// CREATE
	const handle_create_address = async () => {
		const item = general_state.create.address.item;
		if (!item) return;
		const { id, created_at, updated_at, ...payload } = item as MemberAddress;
		payload.user_id = $member?.id || '';
		const res = await createAddress(payload);
		if (res?.success) {
			general_state.create.address.open = false;
			reset_create_address();
			flash('Address added successfully!');
		} else {
			flash(res?.error || 'Error adding address.', false);
		}
	};

	// UPDATE
	const handle_update_address = async () => {
		const item = general_state.edit.address.item;
		if (!item?.id) return;
		const { id, created_at, updated_at, ...updates } = item as MemberAddress;
		const res = await updateAddress(id as string, updates);
		if (res?.success) {
			general_state.edit.address.open = false;
			general_state.edit.address.item = null;
			flash('Address updated successfully!');
		} else {
			flash(res?.error || 'Error updating address.', false);
		}
	};

	// DELETE
	const handle_delete_address = async () => {
		const item = general_state.delete.address.item;
		if (!item?.id) return;
		const res = await deleteAddress(item.id);
		general_state.delete.address.open = false;
		general_state.delete.address.item = null;
		if (res?.success) {
			flash('Address deleted successfully!');
		} else {
			flash(res?.error || 'Error deleting address.', false);
		}
	};

	// SET PRIMARY
	const handle_set_primary_address = async (id: string | null | undefined) => {
		if (!id) return;
		const res = await setPrimaryAddress(id);
		if (!res?.success) {
			flash(res?.error || 'Error setting primary address.', false);
		}
	};
</script>


<div id="tab-general" class="flex flex-col gap-4 w-full lg:w-[80%] mt-10 mb-20">


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
            bind:value={meta.data.username}
            class={`${input_class} mb-4`}
          />
        </div>
        <div class="w-full lg:w-1/3 flex flex-col justify-start items-start gap-1">
          <Label>Pronouns</Label>
          <input
            id="pronouns"
            type="text"
            bind:value={meta.data.pronouns}
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
            bind:value={meta.data.first_name}
            class={input_class}
          />
        </div>
        <div class="w-full lg:w-1/2 flex flex-col justify-start items-start gap-1">
          <Label>Last Name</Label>
          <input
            id="last_name"
            type="text"
            bind:value={meta.data.last_name}
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
            bind:value={meta.data.email}
            class={input_class}
          />
        </div>
        <div class="w-full lg:w-2/5 flex flex-col justify-start items-start gap-1">
          <Label>Phone number</Label>
          <input
            id="phone"
            type="phone"
            bind:value={meta.data.phone_number}
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
      <div class="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3  gap-4">
        {#if visibleAddresses.length > 0}
          {#each visibleAddresses as address, index}
            <div class={account_card_class}>
              <div class="w-full flex flex-row gap-2">
                <div class="flex flex-1"></div>
                <!-- Primary -->
                {#if  address.primary}
                  <Tooltip triggeredBy={`#primary-${index}`}>Primary address</Tooltip>
                  <button
                    aria-label="Primary address"
                    class="text-neutral-600 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400 cursor-pointer"
                  >
                    <i id={`primary-${index}`} class={`fi fi-${address.primary ? 'ss-heart' : 'rr-heart'} text-green-400 hover:text-green-500`}></i>
                  </button>
                  {:else}
                  <Tooltip triggeredBy={`#primary-${index}`}>Set as primary address</Tooltip>
                  <button
                    aria-label="Set as primary address"
                    class="text-neutral-600 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400 cursor-pointer"
                    onclick={() => handle_set_primary_address(address.id)}
                  >
                    <i id={`primary-${index}`} class="fi fi-ss-heart text-neutral-600 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400"></i>
                  </button>
                {/if}

                <!-- Edit -->
                <button
                  aria-label="Edit address"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-amber-500 dark:hover:sky-red-400 cursor-pointer"
                  onclose={() => {
                    general_state.edit.address.open = false;
                    general_state.edit.address.item = null;
                  }}
                  onclick={() => {
                    general_state.edit.address.item = { ...address };
                    general_state.edit.address.open = true;
                  }}
                >
                  <i class="fi fi-ss-edit text-amber-400 hover:text-amber-500"></i>
                </button>
                <Modal
                  bind:open={general_state.edit.address.open}
                  size="lg"
                  class={modal_base_class}
                  classes={{ body: modal_body_class}}
                  >
                  <div class="w-full flex flex-col justify-center items-start px-8 pb-8 ">
                    <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                      Edit "{general_state.edit.address.item?.label}"
                    </h3>
                    <hr class="w-full mb-8 h-px bg-mist-700 dark:bg-mist-300 border-t-mist-300  dark:border-t-mist-600 border-t ">
                    {#if general_state.edit.address.item}
                      <AddressForm bind:address={general_state.edit.address.item} editing={true} />
                    {/if}
                    <div class="flex w-full flex-row gap-4 justify-end items-center mt-4">
                      <button
                        class={`${button_cancel}`}
                        onclick={() => {
                          general_state.edit.address.open = false;
                          general_state.edit.address.item = null;
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        class={button_1}
                        onclick={handle_update_address}
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
                    general_state.delete.address.open = false;
                    general_state.delete.address.item = null;
                  }}
                  onclick={() => {
                    general_state.delete.address.item = address;
                    general_state.delete.address.open = !general_state.delete.address.open;
                  }}>
                    <i class="fi fi-ss-trash  text-red-400 hover:text-red-500"></i>
                </button>
                <Modal
                  bind:open={general_state.delete.address.open}
                  size="md"
                  class={modal_base_class}
                  classes={{ body: modal_body_class}}
                >
                  <div class="w-full flex flex-col justify-center items-center">
                    <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                      Delete "{general_state.delete.address.item?.label}"
                    </h3>
                    <p class="text-neutral-600 dark:text-neutral-400 m-0">
                      Are you sure you want to delete the address "{general_state.delete.address.item?.label}"?
                    </p>
                    <small class="text-neutral-600 dark:text-neutral-400 mx-0 mt-0 mb-4">This action cannot be undone.</small>
                    <div class="w-1/2 mx-auto flex flex-row gap-4 justify-center items-center mt-4">
                      <button
                        class="rounded-md cursor-pointer bg-neutral-300 px-4 py-2 text-neutral-800 hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                        onclick={() => {
                          general_state.delete.address.open = false;
                          general_state.delete.address.item = null;
                          general_state.delete.address.open = false;
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        class="rounded-md cursor-pointer bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                        onclick={handle_delete_address}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
              <h4 class="text-neutral-800 dark:text-neutral-200 font-semibold my-1">{address.label}</h4>
              <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.address_line1}</p>
              {#if address.address_line2?.length}
                <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.address_line2}</p>
              {/if}
              <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.city}, {address.state} {address.postal_code}</p>
              <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.country}</p>
            </div>
          {/each}
        <!-- {:else}
          <p class="text-neutral-600 dark:text-neutral-400 mb-0">No addresses found.</p> -->
        {/if}
        <div class={account_new_item_class}>
          <button
            aria-label="Add new address"
            id="btn-add_new_address"
            class="w-full h-full cursor-pointer min-h-37"
            onclick={() => {
              general_state.create.address.open = !general_state.create.address.open;
            }}
          >
            <i class="fi fi-ss-plus text-amber-400 hover:text-amber-500 text-2xl"></i>
          </button>
          <Tooltip triggeredBy="#btn-add_new_address">Add a new address</Tooltip>
          <Modal
            bind:open={general_state.create.address.open}
            size="lg"
            class={modal_base_class}
            classes={{ body: modal_body_class}}
          >
            <div class="w-full min-h-37 flex flex-col justify-center items-start px-8 pb-8">
              <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                Add New Address
              </h3>
              <hr class="w-full mb-8 h-px bg-mist-700 dark:bg-mist-300 border-t-mist-300  dark:border-t-mist-600 border-t ">
              <AddressForm address={general_state.create.address.item} editing={false} />
              <div class="w-full flex flex-row gap-4 justify-end items-end mt-4">
                <button
                  class={`${button_cancel}`}
                  onclick={() => {
                    general_state.create.address.open = false;
                  }}
                >
                  Cancel
                </button>
                <button
                  class={`${button_1} cursor-pointer`}
                  onclick={handle_create_address}
                >
                  Add Address
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  </div>

  <!-- Save Changes -->
  <div class="ctr-save_changes w-full flex flex-col lg:flex-row gap-4">
    <div class="flex flex-1"></div>
    <div class="w-full lg:w-3/4">
      <button
        class={`${button_1} w-full cursor-pointer`}
        onclick={() => {
          update_user_account();
        }}
      >
        Save Changes
      </button>
    </div>
  </div>
</div>
