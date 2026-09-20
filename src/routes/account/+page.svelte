<script lang="ts">

  // imports
  import {

		Tooltip,
		Spinner,
		Toast, ToastContainer, P, Button, Heading
	} from 'flowbite-svelte';
	import { fly } from "svelte/transition";
	import { Swords } from "lucide-svelte"
	import Dropzone from 'svelte-file-dropzone';
	import { browser } from '$app/environment';

	// Utils
	import { containerClasses, button_1, button_cancel } from '$lib/utils/style';
	import { page } from '$app/stores';

	// Components
	// import AddressForm from './components/AddressForm.svelte';
	import GeneralTab from './components/tabs/GeneralTab.svelte';
	import SecurityTab from './components/tabs/SecurityTab.svelte';
	import PaymentMethodsTab from './components/tabs/PaymentMethodsTab.svelte';

	// Data
	const supabase = $derived($page.data.supabase), user = $derived($page.data.user);
	import { countries } from '$lib/assets/data/countries';
	import { states } from '$lib/assets/data/states';
	// Debug:
	// svelte-ignore state_referenced_locally
	// console.log('Account page - User:', user);
	// console.log('Account page - Supabase client:', supabase);

  // type

	// debug
	// console.log('Account page - member:', $member);
	// console.log('Account page - member.addresses:', $member?.addresses);

  // lifecycle
  import { onMount, onDestroy, tick } from 'svelte';
	import type { MemberAddress } from '$lib/types/member';
	import { error } from '@sveltejs/kit';

	// Stores:
  import {
    addressesStore,
    addresses as userAdresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddress
  } from '$lib/stores/addresses.svelte';
import SubscriptionTab from './components/tabs/SubscriptionTab.svelte';
  import {
    member,
    initMemberStore
  } from '$lib/stores/member.svelte';

  // state
  const dark_mode = $state(browser && window?.matchMedia && window?.matchMedia('(prefers-color-scheme: dark)').matches);
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
        { name: 'Payment Methods', href: '#', current: false },
        { name: 'Subscription', href: '#', current: false }
  		],
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
            // svelte-ignore state_referenced_locally
            user_id: user?.id || '',
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

  	}),
  metadata_state = $state({
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
    success: '',
    error: ''
  })

  onMount(async () => {
    // The member store is idempotent and is normally initialised by the root
    // layout; awaiting it here guarantees `$member` is populated for this user
    // (refreshing its data) without duplicating the realtime channel.
    await initMemberStore(user, supabase);
  })

  $effect(() => {
    if ($member) {
      metadata_state.username = $member.user_metadata.username || '';
      metadata_state.email = $member.user_metadata.email || '';
      metadata_state.pfp = $member.user_metadata.pfp_url || default_pfp;
      metadata_state.first_name = $member.user_metadata.first_name || '';
      metadata_state.last_name = $member.user_metadata.last_name || '';
      metadata_state.phone_number = $member.user_metadata.phone_number || '';
      metadata_state.pronouns = $member.user_metadata.pronouns || '';
      metadata_state.admin = $member.user_metadata.admin || false;
      metadata_state.invitation = $member.user_metadata.invitation || {
        token: '',
        email: '',
        accepted: false
      };
      metadata_state.reset_token = $member.user_metadata.reset_token || '';
      metadata_state.subscription_plan = $member.user_metadata.plan || {
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
  // The member store is initialised in the root layout; it fetches the member
  // and seeds the addresses / payment-method stores, so nothing to do here.


  // const addresses = addressesStore.fetchAddressesByUser(memberStore.Member?.id || '');
  let visibleAddresses = $derived($userAdresses ?? []);
  // console.log('Account page - visibleAddresses:', visibleAddresses);


	onDestroy(() => {
	  console.log('Account page destroyed.');
	});

  // functions
  // -- UI
  // Toasts
  type ToastColor = "green" | "red" | "yellow" | "blue";
  interface ToastItem {
    id: number;
    message: string;
    color: ToastColor;
    timeoutId?: ReturnType<typeof setTimeout>;
    visible: boolean;
  }

  let toasts = $state<ToastItem[]>([]), nextId = $state(1);

  const addToast = (color: ToastColor, message: string) => {
    const newToast: ToastItem = {
      id: nextId,
      message,
      color,
      visible: true
    };

    // Auto-dismiss after 5 seconds
    const timeoutId = setTimeout(() => {
      dismissToast(newToast.id);
    }, 5000);
    newToast.timeoutId = timeoutId;

    toasts = [...toasts, newToast];
    nextId++;
  }
  const dismissToast = (id: number) => {
    // Clear timeout if it exists
    const toast = toasts.find((t) => t.id === id);
    if (toast?.timeoutId) {
      clearTimeout(toast.timeoutId);
    }

    // Set visible to false to trigger outro transition
    toasts = toasts.map((t) => (t.id === id ? { ...t, visible: false } : t));

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 300); // Slightly longer than transition duration
  }
  const handleClose = (id: number) => {
    return () => {
      dismissToast(id);
    };
  }
 	const handle_toast = (message: string, type: 'success' | 'error') => {
    const color: ToastColor = type === 'success' ? 'green' : 'red';
     account_state.success = message;
     account_state.error = '';
     addToast(color, account_state.success);
     setTimeout(() => {
       account_state.success = '';
     }, 3000);
   };

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
		member.update((m) =>
			m ? { ...m, user_metadata: { ...m.user_metadata, pfp_url: urlData.publicUrl || '' } } : m
		);

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
	const toggle_admin = async () => {
	  const currentMember = $member;
	  if(!currentMember) return;
    const new_admin_status = !currentMember.user_metadata.admin;
    const result = await fetch(`/api/auth/toggle-admin/${user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        admin: new_admin_status
      })
    });

    if (result.ok) {
      member.update((m) =>
        m ? { ...m, user_metadata: { ...m.user_metadata, admin: new_admin_status } } : m
      );
      handle_toast(`Admin status updated to ${new_admin_status}`, "success");
    } else {
      console.error('Error updating admin status: ', result.statusText);
      handle_toast('Error updating admin status', "error");
    }
	}
</script>

<div class={containerClasses}>
  <ToastContainer position="top-right">
    {#each toasts as toast (toast.id)}
      <Toast color={toast.color} dismissable={true} transition={fly} params={{ x: 200, duration: 800 }} class="w-64" onclose={handleClose(toast.id)} bind:toastStatus={toast.visible}>
        {#snippet icon()}
          <Swords size={10}  color={`${ dark_mode ? 'white' : 'black' }`} strokeWidth={2} />
          {/snippet}
        <div class="flex flex-row flex-1">
          <P>{toast.message}</P>
        </div>
      </Toast>
    {/each}
  </ToastContainer>
  <div class="bg-white/60 p-0 shadow-xl dark:bg-white/10 rounded-md flex flex-col justify-start items-center">
    <div class="w-full flex flex-col md:flex-row pt-4 lg:pt-8 px-4 lg:px-8">
      <div class="h-30 w-30 flex flex-col justify-start items-center md:mb-8">
        <Dropzone
					id="upload_pfp"
					on:drop={handle_pfp_drop}
					class="flex w-full h-full cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-amber-400 bg-white bg-cover bg-center dark:bg-neutral-800"
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
        <h4 class="text-mist-700 dark:text-mist-400">{user?.user_metadata?.email }</h4>
        <!-- <button onclick={toggle_admin} class={`${button_1}`}>toggle admin</button> -->
      </div>
    </div>
    <div class="flex flex-row w-full border-t-mist-300  dark:border-t-mist-600 border-t overflow-hidden">
      {#each account_state.tabs as tab}
        <button
          class={`${
            account_state.current_tab === tab.name ? 'bg-mist-200 dark:bg-mist-700' : 'bg-transparent'
          } flex-1 lg:min-h-8.75 overflow-hidden py-2 text-center text-sm lg:text-md text-neutral-800 dark:text-neutral-200 hover:bg-mist-200 dark:hover:bg-mist-700 cursor-pointer`}
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
      <GeneralTab
        {user}
        {supabase}
        onsuccess={() => { handle_toast("User account updated successfully!", "success")}}
        onerror={() => { handle_toast("Error updating user account!", "error") }}
      />
    {:else if account_state.current_tab === 'Security'}
    <SecurityTab
      {user}
      {supabase}
      onsuccess={() => { handle_toast("User security settings updated successfully!", "success")}}
      onerror={() => { handle_toast("Error updating user security settings!", "error") }}
    />
    {:else if account_state.current_tab === 'Payment Methods'}
    <PaymentMethodsTab
      {user}
      {supabase}
      onsuccess={() => { handle_toast("User payment methods updated successfully!", "success")}}
      onerror={() => { handle_toast("Error updating user payment methods!", "error") }}
    />
    {:else if account_state.current_tab === 'Subscription'}
    <SubscriptionTab
      {user}
      {supabase}
      onsuccess={() => { handle_toast("User subscription updated successfully!", "success")}}
      onerror={() => { handle_toast("Error updating subscription!", "error") }}
    />
    {/if}
  </div>
</div>
