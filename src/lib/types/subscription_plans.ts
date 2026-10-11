export type SubscriptionPlan = {
  id?: string | null;
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR';
  billing_interval: 'month' | 'year';
  start_date?: string;
  end_date?: string;
  square_plan_id?: string | null;
  square_plan_variation_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
