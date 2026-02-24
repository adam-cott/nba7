/**
 * Debug endpoint — checks env vars and Supabase row counts.
 * Hit GET /api/debug to verify configuration and data state.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured, TABLES } from '@/lib/supabase';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars (present/missing only — never expose values)
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
  };

  // 2. Check supabaseAdmin
  results.supabaseAdmin = supabaseAdmin !== null ? 'configured' : 'NULL — writes will be skipped';

  // 3. Check isSupabaseConfigured
  results.supabaseConfigured = isSupabaseConfigured();

  // 4. Check Supabase row counts
  if (supabaseAdmin) {
    try {
      const { count, error } = await supabaseAdmin
        .from(TABLES.ARTICLE_COMMENTS)
        .select('*', { count: 'exact', head: true });
      results.supabaseCommentCount = error
        ? `ERROR: ${error.message}`
        : `${count ?? 0} rows in article_comments`;
    } catch (err) {
      results.supabaseCommentCount = `EXCEPTION: ${String(err)}`;
    }

    try {
      const { count, error } = await supabaseAdmin
        .from(TABLES.NEWS_ITEMS)
        .select('*', { count: 'exact', head: true });
      results.supabaseNewsCount = error
        ? `ERROR: ${error.message}`
        : `${count ?? 0} rows in news_items`;
    } catch (err) {
      results.supabaseNewsCount = `EXCEPTION: ${String(err)}`;
    }
  } else {
    results.supabaseCommentCount = 'SKIPPED — supabaseAdmin is null';
    results.supabaseNewsCount = 'SKIPPED — supabaseAdmin is null';
  }

  return NextResponse.json(results, { status: 200 });
}
