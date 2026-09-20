import type { User } from '@supabase/supabase-js';

export type MemberAddress = {
  id?: string | null;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  primary: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MemberPaymentMethod = {
  id?: string | null;
  user_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  primary: boolean;
  created_at?: string;
  updated_at?: string;
};

export type MemberMetadata = {
  username: string;
  email: string;
  pfp: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  pronouns: string;
  admin: boolean;
  invitation: {
    token: string;
    email: string;
    accepted: boolean; },
  reset_token: string;
  member: boolean;
  subscription_plan: {
    id: 1;
    name: 'Free';
    description: 'Free plan with limited features';
    price: 0;
    currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR';
    billing_interval: 'month' | 'year';
    created_at?: string;
  },
}

// Raw shape of a row in the `members` table. This is the persistence-layer
// counterpart to the fused `Member` type below: it holds the app-specific
// columns that extend Supabase's auth `User`, but not the auth fields
// themselves (which live in `auth.users`) nor the relational addresses /
// payment methods (which live in their own tables).
export type MemberRecord = {
  id?: string | null;
  user_id: string; // FK -> auth.users.id
  admin: boolean;
  pfp: string;
  metadata: MemberMetadata;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AppSubscription = {
  id?: string | null;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: 'month' | 'year';
  created_at?: string;
  updated_at?: string;
};


// The fused, application-facing view of a user. It combines Supabase's auth
// `User` (id, email, user_metadata, ...) with the `members` record's
// app-specific fields and the user's related addresses / payment methods.
export type Member = User & {
  user_id: string; // Supabase user ID (mirrors `id`)
  addresses: MemberAddress[];
  payment_methods: MemberPaymentMethod[];
  metadata: MemberMetadata;
}
