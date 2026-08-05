import type { User } from '@supabase/supabase-js';

export type UserAddress = {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
};

export type UserPaymentMethod = {
  id: string;
  user_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  created_at: string;
  updated_at: string;
};

export type AppSubscription = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: 'month' | 'year';
  created_at: string;
  updated_at: string;
};


export type AppUser = User & {
  user_id: string; // Supabase user ID
  addresses: UserAddress[];
  payment_methods: UserPaymentMethod[];
}
