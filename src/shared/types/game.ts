export type GameState = 'loading' | 'create' | 'play' | 'result' | 'leaderboard' | 'error';

export type Statement = {
  text: string;
  description?: string; // Optional description for truths
};

export type GamePost = {
  postId: string;
  authorId: string;
  authorUsername: string;
  truth1: Statement;
  truth2: Statement;
  lie: Statement;
  lieIndex: number; // 0, 1, or 2 - which position is the lie
  createdAt: number;
  totalGuesses: number;
  correctGuesses: number;
  guessBreakdown: [number, number, number]; // votes for each option
};

export type UserGuess = {
  userId: string;
  username: string;
  postId: string;
  guessIndex: number; // 0, 1, or 2
  isCorrect: boolean;
  timestamp: number;
};

export type UserScore = {
  userId: string;
  username: string;
  guesserPoints: number;
  liarPoints: number;
  weeklyGuesserPoints: number;
  weeklyLiarPoints: number;
  level: number;
  experience: number;
  totalGames: number;
  correctGuesses: number;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  rank: number;
};

export type GameSettings = {
  subredditName: string;
};

// API Response types
export type ApiResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

export type CreateGameRequest = {
  truth1: Statement;
  truth2: Statement;
  lie: Statement;
};

export type GuessRequest = {
  postId: string;
  guessIndex: number;
};

export type GuessResponse = {
  isCorrect: boolean;
  lieIndex: number;
  gamePost: GamePost;
  userScore: UserScore;
  leveledUp?: boolean;
  newLevel?: number;
};

export type LeaderboardResponse = {
  guesserLeaderboard: LeaderboardEntry[];
  liarLeaderboard: LeaderboardEntry[];
  userStats?: UserScore;
};

// Level system
export type Level = {
  level: number;
  name: string;
  experienceRequired: number;
  flairText: string;
  flairColor: string;
};