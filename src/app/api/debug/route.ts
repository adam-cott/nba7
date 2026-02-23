/**
 * Debug endpoint — checks env vars, YouTube API, and Supabase admin.
 * Hit GET /api/debug to diagnose comment pipeline issues.
 * Remove this file once the issue is resolved.
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

  // 4. Test YouTube API
  if (!process.env.YOUTUBE_API_KEY) {
    results.youtube = 'SKIPPED — YOUTUBE_API_KEY not set';
  } else {
    try {
      const { google } = await import('googleapis');
      const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
      const res = await youtube.search.list({
        part: ['snippet'],
        q: 'NBA highlights',
        type: ['video'],
        maxResults: 1,
      });
      const items = res.data.items;
      results.youtube = items && items.length > 0
        ? `OK — found video: "${items[0].snippet?.title}"`
        : 'OK — but no videos returned';
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      results.youtube = `ERROR ${e.code ?? ''}: ${e.message ?? String(err)}`;
    }
  }

  // 5. Test Supabase admin write capability — check comment count
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
