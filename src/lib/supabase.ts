/**
 * Supabase Client Configuration
 *
 * This file sets up the Supabase client for database operations.
 * You'll need to add your Supabase URL and anon key to .env.local
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy-initialized Supabase client
let _supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client instance
 * Creates the client on first call if credentials are available
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  return _supabase;
}

// Legacy export for backward compatibility (creates a dummy client if not configured)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

// Database table names for easy reference
export const TABLES = {
  NEWS_ITEMS: 'news_items',
  POLLS: 'polls',
  POLL_RESPONSES: 'poll_responses',
} as const;

/**
 * Helper function to check if Supabase is configured
 * Use this before making database calls to provide better error messages
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
