<script lang="ts">

  // types
  import type { User } from "@supabase/supabase-js";
  import type { MemberPaymentMethod } from '$lib/types/member';

  // imports
  // -- UI
  import {
    button_1,
    button_cancel,
    input_class,
    modal_base_class,
    modal_body_class,
    account_card_class,
    account_tab,
    account_new_item_class,

  } from '$lib/utils/style';
  import { Tooltip, Modal } from 'flowbite-svelte';
  // -- Svelte
  import { tick, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  // -- Square
  import { PUBLIC_SQUARE_APPLICATION_ID, PUBLIC_SQUARE_LOCATION_ID } from '$env/static/public';
  const squareApplicationId = PUBLIC_SQUARE_APPLICATION_ID, squareLocationId = PUBLIC_SQUARE_LOCATION_ID;
  let square_loaded = false;
  import { v4 as uuidv4 } from 'uuid'

  // props
  let {
    user = $bindable(),
    supabase = $bindable(),
    onsuccess = () => {},
    onerror = () => {}
  } = $props<{ user: User, supabase: any, onsuccess: () => void, onerror: () => void }>();


  // Debug
  // console.log('PaymentMethodsTab - user:', user);

  // Stores:
  import {
    paymentMethodsStore,
    paymentMethods as userPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setPrimaryPaymentMethod
  } from '$lib/stores/payment_methods.svelte';
  import { member, fetchMember } from '$lib/stores/member.svelte';

  // state
const state = $state({
    error: '',
    success: '',
    loading: {
      leading: true,
      paymentMethods: true
    },
    create: {
      paymentMethod: {
        open: false,
        item: null as MemberPaymentMethod | null
      }
    },
    edit: {
      paymentMethod: {
        open: false,
        item: null as MemberPaymentMethod | null
      }
    },
    delete: {
      paymentMethod: {
        open: false,
        item: null as MemberPaymentMethod | null
      }
    }
  });
  let visiblePaymentMethods = $derived($userPaymentMethods ?? []);
  // lifecycle
  // functions
  // -- PaymentMethod CRUD
	const reset_create_payment_method = () => {
		state.create.paymentMethod.item = {
      user_id: $member?.id || '',
      card_brand: '',
      card_last4: '',
      card_exp_month: 0,
      card_exp_year: 0,
      primary: false
    };
	};

	const flash = async (message: string, ok = true) => {
		if (ok) {
			state.success = message;
			state.error = '';
		} else {
			state.error = message;
			state.success = '';
		}
		await tick();
		setTimeout(() => {
			state.success = '';
			state.error = '';
		}, 3000);
	};

	// CREATE
	const handle_create_payment_method = async () => {
		const item = state.create.paymentMethod.item;
		if (!item) return;
		const { id, created_at, updated_at, ...payload } = item as MemberPaymentMethod;
		payload.user_id = $member?.id || '';
		const res = await createPaymentMethod(payload);
		if (res?.success) {
			state.create.paymentMethod.open = false;
			reset_create_payment_method();
			flash('PaymentMethod added successfully!');
		} else {
			flash(res?.error || 'Error adding PaymentMethod.', false);
		}
	};

	// UPDATE
	const handle_update_payment_method = async () => {
		const item = state.edit.paymentMethod.item;
		if (!item?.id) return;
		const { id, created_at, updated_at, ...updates } = item as MemberPaymentMethod;
		const res = await updatePaymentMethod(id as string, updates);
		if (res?.success) {
			state.edit.paymentMethod.open = false;
			state.edit.paymentMethod.item = null;
			flash('PaymentMethod updated successfully!');
		} else {
			flash(res?.error || 'Error updating PaymentMethod.', false);
		}
	};

	// DELETE
	const handle_delete_payment_method = async () => {
		const item = state.delete.paymentMethod.item;
		if (!item?.id) return;
		const res = await deletePaymentMethod(item.id);
		state.delete.paymentMethod.open = false;
		state.delete.paymentMethod.item = null;
		if (res?.success) {
			flash('PaymentMethod deleted successfully!');
		} else {
			flash(res?.error || 'Error deleting PaymentMethod.', false);
		}
	};

	// SET PRIMARY
	const handle_set_payment_method = async (id: string | null | undefined) => {
		if (!id) return;
		const res = await setPrimaryPaymentMethod(id);
		if (!res?.success) {
			flash(res?.error || 'Error setting primary PaymentMethod.', false);
		}
	};

	// Square
	let payments: any, card: any;
	const initializeCard = async (payments: any) => {
    const card = await payments.card();
    await card.attach("#card-container");
    return card;
  }

	$effect(() => {
	  if (!(state.create.paymentMethod.open && browser && squareApplicationId && squareLocationId)) return;

	  let cancelled = false;
	  let cardButton: HTMLButtonElement | null = null;
	  let onCardButtonClick: ((event: any) => Promise<void>) | null = null;

	  // $effect can't be async, so run the Square setup in an async IIFE
	  (async () => {
			console.log("Square.js loading...");

        if (!window.Square) {
          console.error("Square.js failed to load properly");
          return;
        } else {
        console.log("Square.js loaded");

         payments = window?.Square?.payments(squareApplicationId, squareLocationId);
        square_loaded = payments;
        // let card :any;
        try {
          // wait for the modal content (#card-container) to be rendered
          await tick();
          const newCard = await initializeCard(payments);
          if (cancelled) {
            newCard.destroy();
            return;
          }
          card = newCard;
          // console.log("card", card);
          // Credit Cards:
          const createPayment = async (token: any) => {
            const body = JSON.stringify({
              locationId: squareLocationId,
              sourceId: token,
              customerId: user?.user_metadta?.square_customer_id,
              idempotencyKey: uuidv4(),
              amountMoney: {
                amount: 1,
                currency: "USD",
              },
              appFeeMoney: {
                amount: 0,
                currency: "USD",
              },
            }),
            paymentResponse = await fetch("/api/square/payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body,
              });
              console.log("paymentResponse", paymentResponse);
              if (paymentResponse.status == "COMPLETED") {
                return paymentResponse;
                } else {
              // const errorBody = await paymentResponse.text();
              // throw new Error(errorBody);
                }
            },
            tokenize = async (paymentMethod: any) => {
            const tokenResult = await paymentMethod.tokenize();
            if (tokenResult.status === "OK") {
              return tokenResult.token;
            } else {
              let errorMessage = `Tokenization failed-status: ${tokenResult.status}`;
              if (tokenResult.errors) {
                errorMessage += ` and errors: ${JSON.stringify(
                  tokenResult.errors
                )}`;
              }
              throw new Error(errorMessage);
            }
          },
            displayPaymentResults = (status: any) => {
            const statusContainer = document.getElementById(
              "payment-status-container"
            );
            if (status === "SUCCESS") {
              statusContainer?.classList.remove("is-failure");
              statusContainer?.classList.add("is-success");
            } else {
              statusContainer?.classList.remove("is-success");
              statusContainer?.classList.add("is-failure");
            }

            if(statusContainer)
            statusContainer.style.visibility = "visible";
          },
            handlePaymentMethodSubmission = async (event: any, paymentMethod: any) => {
              event.preventDefault();
              const cardButton = document.getElementById("card-button") as HTMLButtonElement | null;

              try {
                // disable the submit button as we await tokenization and make a
                // payment request.
                if (!paymentMethod) {
                  throw new Error("Payment method is not initialized");
                }

                if(!cardButton) {
                  throw new Error("Card button is not initialized");
                }
                cardButton.disabled = true;
                const token = await tokenize(paymentMethod);

                /*
                  Use card to get the token, then use token to add card to user's payment methods
                */

                // const address = {
                //   addressLin1: auth?.user?.addresses?.street,
                //   addressLin2: auth?.user?.addresses?.street2 ?? "",
                //   locality: auth?.user?.addresses?.town_city,
                //   administrativeDistrictLevel1: auth?.user?.addresses?.state,
                //   postalCode: auth?.user?.addresses?.postal_zip_code,
                //   country: auth?.user?.addresses?.country,
                // };

                  const body = JSON.stringify({
                    idempotencyKey: uuidv4(),
                    sourceId: token,
                    card: {
                      cardholderName: `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}`,
                      customerId: user?.user_metadata?.square_customer_id,
                    },
                  });

                // billingAddress: address,

                const newCard = await fetch("/api/square/customers/cards/create", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body,
                  });
                  console.log("createCardResponse", newCard);
                  tick();
                  state.success = "Payment method added successfully!";
                // const paymentResults = await createPayment(token);
                // displayPaymentResults("SUCCESS");

                // console.debug("Payment Success", paymentResults);
                  } catch (Event: any) {
                    if(!cardButton) {
                      throw new Error("Card button is not initialized");
                    }
                    cardButton.disabled = false;
                    displayPaymentResults("FAILURE");
                    console.error(Event.message);
                  }
              };

            cardButton = document.getElementById("card-button") as HTMLButtonElement | null;
            onCardButtonClick = (event: any) => handlePaymentMethodSubmission(event, card);
            cardButton?.addEventListener("click", onCardButtonClick);

          } catch (e) {
        console.error("Initializing Card failed", e);
        return;
      }
        }
	  })();

	  // runs when the modal closes / component unmounts
	  return () => {
	    cancelled = true;
	    if (cardButton && onCardButtonClick) {
	      cardButton.removeEventListener("click", onCardButtonClick);
	    }
	    card?.destroy?.();
	    card = undefined;
	  };
  });


//
//   const handle_create_payment_method_square = async () => {
//     if (!card) return;
//     const result = await card.tokenize();
//     if (result.status === 'OK') {
//       const token = result.token;
//       // Send the token to your server to create a payment method
//       const res = await createPaymentMethod({ user_id: $member?.id || '', token });
//       if (res?.success) {
//         state.create.paymentMethod.open = false;
//         reset_create_payment_method();
//         flash('PaymentMethod added successfully!');
//       } else {
//         flash(res?.error || 'Error adding PaymentMethod.', false);
//       }
//     } else {
//       flash('Error tokenizing card. Please check your card details.', false);
//     }
// 	}
</script>
<div id="tab-payment" class="{account_tab}">

  <div class="ctr-personal w-full flex flex-col lg:flex-row gap-4 mb-10">
    <div class="w-full lg:w-1/4 flex flex-col justify-start items-start p-2">
      <h3 class="text-neutral-800 dark:text-neutral-200 text-lg">Payment Methods</h3>
    </div>
    <div class="w-full lg:w-3/4 flex flex-col">
      <div class="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3  gap-4">
        {#if visiblePaymentMethods.length > 0}
          {#each visiblePaymentMethods as paymentMethod, index}
            <div class={account_card_class}>
              <div class="w-full flex flex-row gap-2">
                <div class="flex flex-1"></div>
                <!-- Primary -->
                {#if paymentMethod.primary}
                  <Tooltip triggeredBy={`#primary-${index}`}>Primary payment method</Tooltip>
                  <button
                    aria-label="Primary address"
                    class="text-neutral-600 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400 cursor-pointer"
                  >
                    <i id={`primary-${index}`} class={`fi fi-${paymentMethod.primary ? 'ss-heart' : 'rr-heart'} text-green-400 hover:text-green-500`}></i>
                  </button>
                  {:else}
                  <Tooltip triggeredBy={`#primary-${index}`}>Set as primary payment method</Tooltip>
                  <button
                    aria-label="Set as primary payment method"
                    class="text-neutral-600 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400 cursor-pointer"
                    onclick={() => handle_set_payment_method(paymentMethod.id)}
                  >
                    <i id={`primary-${index}`} class="fi fi-ss-heart text-neutral-600 dark:text-neutral-400 hover:text-green-500 dark:hover:text-green-400"></i>
                  </button>
                {/if}

                <!-- Edit -->
                <button
                  aria-label="Edit payment method"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-amber-500 dark:hover:sky-red-400 cursor-pointer"
                  onclose={() => {
                    state.edit.paymentMethod.open = false;
                    state.edit.paymentMethod.item = null;
                  }}
                  onclick={() => {
                    state.edit.paymentMethod.item = { ... paymentMethod};
                    state.edit.paymentMethod.open = true;
                  }}
                >
                  <i class="fi fi-ss-edit text-amber-400 hover:text-amber-500"></i>
                </button>
                <Modal
                  bind:open={state.edit.paymentMethod.open}
                  size="md"
                  class={modal_base_class}
                  classes={{ body: modal_body_class}}
                  >
                  <div class="w-full flex flex-col justify-center items-start px-8 pb-8 ">
                    <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                      <!-- Edit "{state.edit.paymentMethod.item?.label}" -->
                    </h3>
                    <hr class="w-full mb-8 h-px bg-mist-700 dark:bg-mist-300 border-t-mist-300  dark:border-t-mist-600 border-t ">
                    {#if state.edit.paymentMethod.item}
                      <div></div>
                      {/if}
                    <div class="flex w-full flex-row gap-4 justify-end items-center mt-4">
                      <button
                        class={`${button_cancel}`}
                        onclick={() => {
                          state.edit.paymentMethod.open = false;
                          state.edit.paymentMethod.item = null;
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        class={button_1}
                        onclick={handle_update_payment_method}
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
                    state.delete.paymentMethod.open = false;
                    state.delete.paymentMethod.item = null;
                  }}
                  onclick={() => {
                    state.delete.paymentMethod.item = paymentMethod;
                    state.delete.paymentMethod.open = !state.delete.paymentMethod.open;
                  }}>
                    <i class="fi fi-ss-trash  text-red-400 hover:text-red-500"></i>
                </button>
                <Modal
                  bind:open={state.delete.paymentMethod.open}
                  size="md"
                  class={modal_base_class}
                  classes={{ body: modal_body_class}}
                  >
                  <div class="w-full flex flex-col justify-center items-center">
                    <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                      <!-- Delete "{state.delete.paymentMethod.item?.label}" -->
                    </h3>
                    <p class="text-neutral-600 dark:text-neutral-400 m-0">
                      Are you sure you want to delete the address "{state.delete.paymentMethod.item}"?
                    </p>
                    <small class="text-neutral-600 dark:text-neutral-400 mx-0 mt-0 mb-4">This action cannot be undone.</small>
                    <div class="w-1/2 mx-auto flex flex-row gap-4 justify-center items-center mt-4">
                      <button
                        class="rounded-md cursor-pointer bg-neutral-300 px-4 py-2 text-neutral-800 hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                        onclick={() => {
                          state.delete.paymentMethod.open = false;
                          state.delete.paymentMethod.item = null;
                          state.delete.paymentMethod.open = false;
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        class="rounded-md cursor-pointer bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                        onclick={handle_delete_payment_method}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
              <!-- <h4 class="text-neutral-800 dark:text-neutral-200 font-semibold my-1">{paymentMethod.label}</h4>
              <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.address_line1}</p>
              {#if address.address_line2?.length}
                <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.address_line2}</p>
              {/if}
              <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.city}, {address.state} {address.postal_code}</p>
              <p class="text-neutral-600 dark:text-neutral-400 mb-0 leading-none">{address.country}</p>  -->
            </div>
          {/each}
        <!-- {:else}
          <p class="text-neutral-600 dark:text-neutral-400 mb-0">No addresses found.</p> -->
        {/if}
        <div class={account_new_item_class}>
          <button
            aria-label="Add new address"
            id="btn-add_new_payment_method"
            class="w-full h-full cursor-pointer min-h-37"
            onclick={() => {
              state.create.paymentMethod.open = !state.create.paymentMethod.open;
            }}
          >
            <i class="fi fi-ss-plus text-amber-400 hover:text-amber-500 text-2xl"></i>
          </button>
          <Tooltip triggeredBy="#btn-add_new_payment_method">Add a new payment method</Tooltip>
          <Modal
            bind:open={state.create.paymentMethod.open}

            class={modal_base_class}
            classes={{ body: modal_body_class}}
          >
            <div class="w-full min-h-37 flex flex-col justify-center items-start px-8 pb-8">
              <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                Add New Payment Method
              </h3>
              <hr class="w-full mb-8 h-px bg-mist-700 dark:bg-mist-300 border-t-mist-300  dark:border-t-mist-600 border-t ">
              <div class="mx-auto p-4 flex flex-col justify-center items-start">
                <form id="payment-form">
                  <div id="card-container"></div>
                  <!-- <button
                    id="card-button"
                    type="button"
                    class="w-full rounded-md py-2 px-4 btn-amber text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 mt-4"
                  >
                    Add card
                </button> -->
                </form>
                <div id="payment-status-container"></div>
                {#if state.success}
                  <p class="text-green-500 mt-2 text-sm">
                    { state.success }
                  </p>
                  {:else if state.error}
                  <p class="text-red-500 mt-2 text-sm">
                    { state.error }
                  </p>
                {/if}
              </div>
              <div class="w-full flex flex-row gap-4 justify-end items-end mt-4">
                <button
                  class={`${button_cancel} cursor-pointer`}
                  onclick={() => {
                    state.create.paymentMethod.open = false;
                  }}
                >
                  Cancel
                </button>
                <button
                  id="card-button"
                  class={`${button_1} cursor-pointer`}
                  onclick={handle_create_payment_method}
                >
                  Add Payment Method
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  </div>
</div>

<style>

:global(.sq-card-message-no-error),
:global(.sq-card-message) {
  color: white !important;
}
.sq-card-wrapper .sq-card-message-no-error {
  color: white !important;
}
.sq-card-wrapper .sq-card-message-no-error::before {
  background-color: white !important;
}

</style>
