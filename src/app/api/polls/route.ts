/**
 * Polls API Route
 *
 * GET /api/polls - Get active polls
 * POST /api/polls/vote - Submit a vote
 *
 * Handles poll fetching and voting. Uses localStorage session IDs
 * to prevent duplicate votes without requiring authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { Poll, PollOption } from '@/lib/types';

// In-memory polls for when Supabase is not configured
const mockPolls: Poll[] = [
  {
    id: '1',
    question: 'Who will win MVP this season?',
    options: [
      { text: 'Nikola Jokic', votes: 245 },
      { text: 'Luka Doncic', votes: 189 },
      { text: 'Shai Gilgeous-Alexander', votes: 156 },
      { text: 'Jayson Tatum', votes: 98 },
    ],
    event_context: '2024-25 NBA MVP Race',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    question: 'Which team will win the NBA Championship?',
    options: [
      { text: 'Boston Celtics', votes: 312 },
      { text: 'Oklahoma City Thunder', votes: 287 },
      { text: 'Denver Nuggets', votes: 198 },
      { text: 'Cleveland Cavaliers', votes: 145 },
    ],
    event_context: '2024-25 Championship Predictions',
    active: true,
    created_at: new Date().toISOString(),
  },
];

// Track votes in memory (session_id -> poll_id)
const memoryVotes: Map<string, Set<string>> = new Map();

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
    const { pollId, optionIndex, sessionId } = body;

    // Validate input
    if (!pollId || optionIndex === undefined || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: pollId, optionIndex, sessionId' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from(TABLES.POLL_RESPONSES)
        .select('id')
        .eq('poll_id', pollId)
        .eq('session_id', sessionId)
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

      // Update poll and record vote
      const [updateResult, insertResult] = await Promise.all([
        supabase
          .from(TABLES.POLLS)
          .update({ options })
          .eq('id', pollId),
        supabase
          .from(TABLES.POLL_RESPONSES)
          .insert({
            poll_id: pollId,
            option_index: optionIndex,
            session_id: sessionId,
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
      const userVotes = memoryVotes.get(sessionId) || new Set();
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
      memoryVotes.set(sessionId, userVotes);

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
 * This is the "unlocked content" feature from the spec
 */
function getInsight(question: string): string {
  const insights: Record<string, string> = {
    'Who will win MVP this season?':
      'Fun fact: The last player to win back-to-back-to-back MVPs was Larry Bird (1984-86). Jokic is going for his 4th in 5 years!',
    'Which team will win the NBA Championship?':
      'The Celtics are looking to defend their title. Only 8 teams have successfully repeated as champions in NBA history.',
  };

  return (
    insights[question] ||
    'Thanks for voting! Check back later for more polls and insights.'
  );
}
