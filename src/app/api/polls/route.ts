/**
 * Polls API Route
 *
 * GET /api/polls - Get active polls
 * POST /api/polls - Submit a vote
 *
 * Handles poll fetching and voting. Uses IP addresses
 * to prevent duplicate votes without requiring authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { Poll, PollOption } from '@/lib/types';

// In-memory polls for when Supabase is not configured
const mockPolls: Poll[] = [
  {
    id: '1',
    question: 'Who wins the 2025-26 NBA MVP?',
    options: [
      { text: 'Shai Gilgeous-Alexander', votes: 0 },
      { text: 'Cade Cunningham', votes: 0 },
      { text: 'Nikola Jokic', votes: 0 },
      { text: 'Victor Wembanyama', votes: 0 },
    ],
    event_context: '2025-26 NBA MVP Race',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    question: 'Who wins 2025-26 Rookie of the Year?',
    options: [
      { text: 'Cooper Flagg', votes: 0 },
      { text: 'Ace Bailey', votes: 0 },
      { text: 'Dylan Harper', votes: 0 },
      { text: 'Kon Knueppel', votes: 0 },
      { text: 'Someone else', votes: 0 },
    ],
    event_context: '2025-26 Rookie of the Year',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    question: 'Are the Detroit Pistons a legitimate championship contender?',
    options: [
      { text: "Yes, they're for real", votes: 0 },
      { text: "No, they'll fold in the playoffs", votes: 0 },
      { text: 'Ask me in April', votes: 0 },
    ],
    event_context: '2025-26 Pistons Contender Debate',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    question: 'Who finishes as the 2 seed in the West?',
    options: [
      { text: 'Oklahoma City Thunder', votes: 0 },
      { text: 'San Antonio Spurs', votes: 0 },
      { text: 'Denver Nuggets', votes: 0 },
      { text: 'Houston Rockets', votes: 0 },
      { text: 'Minnesota Timberwolves', votes: 0 },
    ],
    event_context: '2025-26 Western Conference Race',
    active: true,
    created_at: new Date().toISOString(),
  },
];

// Track votes in memory (ip -> poll_id set)
const memoryVotes: Map<string, Set<string>> = new Map();

/**
 * Extract the client IP address from the request.
 * Checks x-forwarded-for (set by Vercel/proxies) first, then falls back.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function GET() {
  try {
    let polls: Poll[] = [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from(TABLES.POLLS)
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching polls:', error);
        polls = mockPolls;
      } else {
        polls = (data as Poll[]) || mockPolls;
      }
    } else {
      polls = mockPolls;
    }

    return NextResponse.json({ polls });
  } catch (error) {
    console.error('Error in polls GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pollId, optionIndex } = body;
    const ipAddress = getClientIp(request);

    // Validate input
    if (!pollId || optionIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: pollId, optionIndex' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      // Check if this IP already voted on this poll (admin client to read poll_responses)
      const { data: existingVote } = await supabaseAdmin
        .from(TABLES.POLL_RESPONSES)
        .select('id')
        .eq('poll_id', pollId)
        .eq('ip_address', ipAddress)
        .single();

      if (existingVote) {
        return NextResponse.json(
          { error: 'You have already voted on this poll', alreadyVoted: true },
          { status: 400 }
        );
      }

      // Get current poll
      const { data: poll, error: pollError } = await supabase
        .from(TABLES.POLLS)
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError || !poll) {
        return NextResponse.json(
          { error: 'Poll not found' },
          { status: 404 }
        );
      }

      // Update vote count
      const options = poll.options as PollOption[];
      if (optionIndex < 0 || optionIndex >= options.length) {
        return NextResponse.json(
          { error: 'Invalid option index' },
          { status: 400 }
        );
      }

      options[optionIndex].votes += 1;

      // Update poll and record vote (admin client to bypass RLS)
      const [updateResult, insertResult] = await Promise.all([
        supabaseAdmin
          .from(TABLES.POLLS)
          .update({ options })
          .eq('id', pollId),
        supabaseAdmin
          .from(TABLES.POLL_RESPONSES)
          .insert({
            poll_id: pollId,
            option_index: optionIndex,
            ip_address: ipAddress,
          }),
      ]);

      if (updateResult.error || insertResult.error) {
        console.error('Error recording vote:', updateResult.error || insertResult.error);
        return NextResponse.json(
          { error: 'Failed to record vote' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        poll: { ...poll, options },
        insight: getInsight(poll.question),
      });
    } else {
      // Use in-memory voting
      const userVotes = memoryVotes.get(ipAddress) || new Set();
      if (userVotes.has(pollId)) {
        return NextResponse.json(
          { error: 'You have already voted on this poll', alreadyVoted: true },
          { status: 400 }
        );
      }

      // Find and update mock poll
      const poll = mockPolls.find((p) => p.id === pollId);
      if (!poll) {
        return NextResponse.json(
          { error: 'Poll not found' },
          { status: 404 }
        );
      }

      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        return NextResponse.json(
          { error: 'Invalid option index' },
          { status: 400 }
        );
      }

      // Record vote
      poll.options[optionIndex].votes += 1;
      userVotes.add(pollId);
      memoryVotes.set(ipAddress, userVotes);

      return NextResponse.json({
        success: true,
        poll,
        insight: getInsight(poll.question),
      });
    }
  } catch (error) {
    console.error('Error in polls POST:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}

/**
 * Generate an insight after user votes
 */
function getInsight(question: string): string {
  const insights: Record<string, string> = {
    'Who wins the 2025-26 NBA MVP?':
      'SGA is looking to claim his first MVP after leading OKC to the best record in the league. Can anyone stop him?',
    'Who wins 2025-26 Rookie of the Year?':
      'Cooper Flagg was the #1 overall pick — but this rookie class is deep. The race could go down to the wire.',
    'Are the Detroit Pistons a legitimate championship contender?':
      'The Pistons went from the worst record in 2023-24 to a playoff contender. Cade Cunningham has taken a massive leap.',
    'Who finishes as the 2 seed in the West?':
      'The Western Conference is stacked — just 4 games separate the 2nd and 6th seeds heading into the stretch run.',
  };

  return (
    insights[question] ||
    'Thanks for voting! Check back later for more polls and insights.'
  );
}
