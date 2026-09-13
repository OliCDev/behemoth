export type Event = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description?: string;
  img?: string;
  type?: string; // public or private
}
