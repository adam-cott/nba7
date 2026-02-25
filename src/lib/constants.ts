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
  LAL: ['lakers', 'lebron', 'luka doncic', 'luka', 'austin reaves', 'la lakers', 'los angeles lakers'],
  GSW: ['warriors', 'golden state', 'stephen curry', 'steph curry', 'draymond', 'jimmy butler'],
  BOS: ['celtics', 'boston', 'jayson tatum', 'jaylen brown', 'jrue holiday'],
  MIA: ['heat', 'miami', 'bam adebayo', 'tyler herro', 'norman powell'],
  PHX: ['suns', 'phoenix', 'devin booker', 'jalen green', 'dillon brooks'],
  MIL: ['bucks', 'milwaukee', 'giannis', 'antetokounmpo', 'myles turner', 'cam thomas'],
  DEN: ['nuggets', 'denver', 'jokic', 'nikola jokic', 'jamal murray', 'aaron gordon'],
  PHI: ['76ers', 'sixers', 'philadelphia', 'joel embiid', 'paul george', 'tyrese maxey'],
  NYK: ['knicks', 'new york knicks', 'jalen brunson', 'karl-anthony towns', 'mikal bridges'],
  DAL: ['mavericks', 'mavs', 'dallas', 'anthony davis', 'kyrie irving', 'klay thompson'],
  LAC: ['clippers', 'la clippers', 'kawhi leonard', 'darius garland', 'terance mann'],
  BKN: ['nets', 'brooklyn', 'michael porter jr', 'nic claxton'],
  ATL: ['hawks', 'atlanta', 'jalen johnson', 'dyson daniels', 'onyeka okongwu'],
  CHI: ['bulls', 'chicago bulls', 'josh giddey', 'coby white'],
  CLE: ['cavaliers', 'cavs', 'cleveland', 'donovan mitchell', 'james harden', 'evan mobley'],
  DET: ['pistons', 'detroit', 'cade cunningham', 'jalen duren', 'ausar thompson'],
  IND: ['pacers', 'indiana', 'tyrese haliburton', 'pascal siakam', 'bennedict mathurin'],
  TOR: ['raptors', 'toronto', 'scottie barnes', 'brandon ingram', 'immanuel quickley'],
  CHA: ['hornets', 'charlotte', 'lamelo ball', 'brandon miller', 'mark williams'],
  ORL: ['magic', 'orlando', 'paolo banchero', 'franz wagner', 'desmond bane'],
  WAS: ['wizards', 'washington', 'trae young', 'alexandre sarr', 'kyle kuzma'],
  MIN: ['timberwolves', 'wolves', 'minnesota', 'anthony edwards', 'julius randle', 'rudy gobert'],
  OKC: ['thunder', 'oklahoma', 'shai gilgeous', 'jalen williams', 'chet holmgren'],
  POR: ['blazers', 'trail blazers', 'portland', 'deni avdija', 'anfernee simons'],
  UTA: ['jazz', 'utah', 'lauri markkanen', 'keyonte george', 'jaren jackson jr'],
  SAC: ['kings', 'sacramento', 'domantas sabonis', 'zach lavine', 'keegan murray'],
  HOU: ['rockets', 'houston', 'kevin durant', 'alperen sengun', 'amen thompson'],
  MEM: ['grizzlies', 'memphis', 'ja morant', 'jaylen wells', 'kentavious caldwell-pope'],
  NOP: ['pelicans', 'new orleans', 'zion williamson', 'trey murphy', 'dejounte murray'],
  SAS: ['spurs', 'san antonio', 'victor wembanyama', 'wemby', 'de\'aaron fox', 'stephon castle'],
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
  CBS_SPORTS: {
    name: 'CBS Sports',
    id: 'cbs-sports',
    rssUrl: 'https://www.cbssports.com/rss/headlines/nba/',
    baseUrl: 'https://www.cbssports.com',
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

export const CACHE_DURATION = {
  NEWS: 15 * 60 * 1000, // 15 minutes
};

// How long cached sentiment stays fresh before re-analyzing via YouTube (in hours)
export const SENTIMENT_CACHE_HOURS = 6;
