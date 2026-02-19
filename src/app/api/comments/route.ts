/**
 * Comments API Route
 *
 * GET /api/comments?url=<article_url> - Fetch cached comments for an article
 *
 * Returns comments from Supabase cache only (never calls YouTube directly).
 * Used by the comment viewer when user clicks an article.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { ArticleComment } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleUrl = searchParams.get('url');

    if (!articleUrl) {
      return NextResponse.json(
        { error: 'Missing required parameter: url' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ comments: [] });
    }

    const { data, error } = await supabase
      .from(TABLES.ARTICLE_COMMENTS)
      .select('*')
      .eq('article_url', articleUrl)
      .order('like_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: (data as ArticleComment[]) || [],
    });
  } catch (error) {
    console.error('Error in comments API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
