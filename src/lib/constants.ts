/**
 * Constants for the NBA News Aggregator
 * Contains all 30 NBA teams and their metadata
 */

import { NBATeam } from './types';

// All 30 NBA teams with full details
export const NBA_TEAMS: NBATeam[] = [
  // Eastern Conference - Atlantic
  { abbreviation: 'BOS', name: 'Celtics', city: 'Boston', conference: 'Eastern', division: 'Atlantic' },
  { abbreviation: 'BKN', name: 'Nets', city: 'Brooklyn', conference: 'Eastern', division: 'Atlantic' },
  { abbreviation: 'NYK', name: 'Knicks', city: 'New York', conference: 'Eastern', division: 'Atlantic' },
  { abbreviation: 'PHI', name: '76ers', city: 'Philadelphia', conference: 'Eastern', division: 'Atlantic' },
  { abbreviation: 'TOR', name: 'Raptors', city: 'Toronto', conference: 'Eastern', division: 'Atlantic' },

  // Eastern Conference - Central
  { abbreviation: 'CHI', name: 'Bulls', city: 'Chicago', conference: 'Eastern', division: 'Central' },
  { abbreviation: 'CLE', name: 'Cavaliers', city: 'Cleveland', conference: 'Eastern', division: 'Central' },
  { abbreviation: 'DET', name: 'Pistons', city: 'Detroit', conference: 'Eastern', division: 'Central' },
  { abbreviation: 'IND', name: 'Pacers', city: 'Indiana', conference: 'Eastern', division: 'Central' },
  { abbreviation: 'MIL', name: 'Bucks', city: 'Milwaukee', conference: 'Eastern', division: 'Central' },

  // Eastern Conference - Southeast
  { abbreviation: 'ATL', name: 'Hawks', city: 'Atlanta', conference: 'Eastern', division: 'Southeast' },
  { abbreviation: 'CHA', name: 'Hornets', city: 'Charlotte', conference: 'Eastern', division: 'Southeast' },
  { abbreviation: 'MIA', name: 'Heat', city: 'Miami', conference: 'Eastern', division: 'Southeast' },
  { abbreviation: 'ORL', name: 'Magic', city: 'Orlando', conference: 'Eastern', division: 'Southeast' },
  { abbreviation: 'WAS', name: 'Wizards', city: 'Washington', conference: 'Eastern', division: 'Southeast' },

  // Western Conference - Northwest
  { abbreviation: 'DEN', name: 'Nuggets', city: 'Denver', conference: 'Western', division: 'Northwest' },
  { abbreviation: 'MIN', name: 'Timberwolves', city: 'Minnesota', conference: 'Western', division: 'Northwest' },
  { abbreviation: 'OKC', name: 'Thunder', city: 'Oklahoma City', conference: 'Western', division: 'Northwest' },
  { abbreviation: 'POR', name: 'Trail Blazers', city: 'Portland', conference: 'Western', division: 'Northwest' },
  { abbreviation: 'UTA', name: 'Jazz', city: 'Utah', conference: 'Western', division: 'Northwest' },

  // Western Conference - Pacific
  { abbreviation: 'GSW', name: 'Warriors', city: 'Golden State', conference: 'Western', division: 'Pacific' },
  { abbreviation: 'LAC', name: 'Clippers', city: 'LA', conference: 'Western', division: 'Pacific' },
  { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles', conference: 'Western', division: 'Pacific' },
  { abbreviation: 'PHX', name: 'Suns', city: 'Phoenix', conference: 'Western', division: 'Pacific' },
  { abbreviation: 'SAC', name: 'Kings', city: 'Sacramento', conference: 'Western', division: 'Pacific' },

  // Western Conference - Southwest
  { abbreviation: 'DAL', name: 'Mavericks', city: 'Dallas', conference: 'Western', division: 'Southwest' },
  { abbreviation: 'HOU', name: 'Rockets', city: 'Houston', conference: 'Western', division: 'Southwest' },
  { abbreviation: 'MEM', name: 'Grizzlies', city: 'Memphis', conference: 'Western', division: 'Southwest' },
  { abbreviation: 'NOP', name: 'Pelicans', city: 'New Orleans', conference: 'Western', division: 'Southwest' },
  { abbreviation: 'SAS', name: 'Spurs', city: 'San Antonio', conference: 'Western', division: 'Southwest' },
];

// Quick lookup map for team names
export const TEAM_NAME_MAP: Record<string, string> = NBA_TEAMS.reduce((acc, team) => {
  acc[team.abbreviation] = `${team.city} ${team.name}`;
  return acc;
}, {} as Record<string, string>);

// Keywords to help match news to teams
export const TEAM_KEYWORDS: Record<string, string[]> = {
  LAL: ['lakers', 'lebron', 'anthony davis', 'la lakers', 'los angeles lakers'],
  GSW: ['warriors', 'golden state', 'stephen curry', 'steph curry', 'klay thompson', 'draymond'],
  BOS: ['celtics', 'boston', 'jayson tatum', 'jaylen brown'],
  MIA: ['heat', 'miami', 'jimmy butler', 'bam adebayo'],
  PHX: ['suns', 'phoenix', 'kevin durant', 'devin booker'],
  MIL: ['bucks', 'milwaukee', 'giannis', 'antetokounmpo'],
  DEN: ['nuggets', 'denver', 'jokic', 'nikola jokic'],
  PHI: ['76ers', 'sixers', 'philadelphia', 'joel embiid'],
  NYK: ['knicks', 'new york knicks', 'jalen brunson'],
  DAL: ['mavericks', 'mavs', 'dallas', 'luka doncic', 'kyrie irving'],
  LAC: ['clippers', 'la clippers', 'kawhi leonard', 'paul george'],
  BKN: ['nets', 'brooklyn'],
  ATL: ['hawks', 'atlanta', 'trae young'],
  CHI: ['bulls', 'chicago bulls'],
  CLE: ['cavaliers', 'cavs', 'cleveland', 'donovan mitchell'],
  DET: ['pistons', 'detroit'],
  IND: ['pacers', 'indiana', 'tyrese haliburton'],
  TOR: ['raptors', 'toronto'],
  CHA: ['hornets', 'charlotte'],
  ORL: ['magic', 'orlando', 'paolo banchero'],
  WAS: ['wizards', 'washington'],
  MIN: ['timberwolves', 'wolves', 'minnesota', 'anthony edwards'],
  OKC: ['thunder', 'oklahoma', 'shai gilgeous'],
  POR: ['blazers', 'trail blazers', 'portland'],
  UTA: ['jazz', 'utah'],
  SAC: ['kings', 'sacramento'],
  HOU: ['rockets', 'houston'],
  MEM: ['grizzlies', 'memphis', 'ja morant'],
  NOP: ['pelicans', 'new orleans', 'zion williamson'],
  SAS: ['spurs', 'san antonio', 'victor wembanyama', 'wemby'],
};

// News sources configuration
export const NEWS_SOURCES = {
  ESPN: {
    name: 'ESPN',
    id: 'espn',
    rssUrl: 'https://www.espn.com/espn/rss/nba/news',
    baseUrl: 'https://www.espn.com',
    qualityBonus: 0, // Baseline source
  },
  BLEACHER_REPORT: {
    name: 'Bleacher Report',
    id: 'bleacher-report',
    rssUrl: 'https://bleacherreport.com/articles/feed?tag_id=20', // NBA tag
    baseUrl: 'https://bleacherreport.com',
    qualityBonus: 100, // Typically more detailed analysis
  },
};

// Clickbait phrases to penalize in quality scoring
export const CLICKBAIT_PHRASES = [
  "you won't believe",
  'shocking',
  'incredible',
  'amazing',
  'must see',
  'will blow your mind',
  "here's why",
  'the reason will',
  'what happened next',
  'breaking:',
  'just in:',
  'wow!',
];

// Sentiment thresholds
export const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.2,  // Score > 0.2 is positive
  NEGATIVE: -0.2, // Score < -0.2 is negative
};

// Cache duration in milliseconds
export const CACHE_DURATION = {
  NEWS: 15 * 60 * 1000, // 15 minutes
  SENTIMENT: 30 * 60 * 1000, // 30 minutes
};
