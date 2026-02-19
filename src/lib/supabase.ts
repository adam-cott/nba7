import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** Public client (anon key) — safe for reads, used client-side */
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

/** Server-side client (service role key) — for writes that bypass RLS */
export const supabaseAdmin: SupabaseClient | null =
  isSupabaseConfigured() && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export const TABLES = {
  NEWS_ITEMS: 'news_items',
  POLLS: 'polls',
  POLL_RESPONSES: 'poll_responses',
  ARTICLE_COMMENTS: 'article_comments',
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
