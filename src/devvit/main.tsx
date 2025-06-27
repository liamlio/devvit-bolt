import { Devvit, useState, useAsync, useForm } from '@devvit/public-api';
import type { GamePost, UserGuess, UserScore, LeaderboardEntry, Statement } from '../shared/types/game';

// Configure Devvit
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
});

// Game Service - simplified for Devvit
class GameService {
  constructor(private redis: any) {}

  // Game Post Management
  async createGamePost(gamePost: GamePost): Promise<void> {
    const key = `game_post:${gamePost.postId}`;
    await this.redis.set(key, JSON.stringify(gamePost));
  }

  async getGamePost(postId: string): Promise<GamePost | null> {
    const key = `game_post:${postId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateGamePost(gamePost: GamePost): Promise<void> {
    await this.createGamePost(gamePost);
  }

  // User Guess Management
  async saveUserGuess(guess: UserGuess): Promise<void> {
    const key = `user_guess:${guess.postId}:${guess.userId}`;
    await this.redis.set(key, JSON.stringify(guess));
  }

  async getUserGuess(postId: string, userId: string): Promise<UserGuess | null> {
    const key = `user_guess:${postId}:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // User Score Management
  async getUserScore(userId: string): Promise<UserScore> {
    const key = `user_score:${userId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return {
      userId,
      username: '',
      guesserPoints: 0,
      liarPoints: 0,
      weeklyGuesserPoints: 0,
      weeklyLiarPoints: 0,
      level: 1,
      experience: 0,
      totalGames: 0,
      correctGuesses: 0,
    };
  }

  async updateUserScore(userScore: UserScore): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const oldLevel = userScore.level;
    const newLevel = this.getLevelByExperience(userScore.experience);
    userScore.level = newLevel.level;
    
    const key = `user_score:${userScore.userId}`;
    await this.redis.set(key, JSON.stringify(userScore));

    await this.updateLeaderboards(userScore);

    const leveledUp = newLevel.level > oldLevel;
    return {
      leveledUp,
      newLevel: leveledUp ? newLevel.level : undefined,
    };
  }

  private async updateLeaderboards(userScore: UserScore): Promise<void> {
    const weekNumber = this.getWeekNumber();
    
    await this.redis.zadd(`leaderboard:guesser:weekly:${weekNumber}`, {
      member: userScore.userId,
      score: userScore.weeklyGuesserPoints,
    });
    await this.redis.zadd('leaderboard:guesser:alltime', {
      member: userScore.userId,
      score: userScore.guesserPoints,
    });

    await this.redis.zadd(`leaderboard:liar:weekly:${weekNumber}`, {
      member: userScore.userId,
      score: userScore.weeklyLiarPoints,
    });
    await this.redis.zadd('leaderboard:liar:alltime', {
      member: userScore.userId,
      score: userScore.liarPoints,
    });
  }

  async getLeaderboard(type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime', limit: number = 10): Promise<LeaderboardEntry[]> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    const results = await this.redis.zRange(key, 0, limit - 1, { withScores: true });
    results.reverse();
    
    const leaderboard: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i++) {
      const { member: userId, score } = results[i];
      const userScore = await this.getUserScore(userId);
      leaderboard.push({
        userId,
        username: userScore.username,
        score,
        rank: i + 1,
      });
    }

    return leaderboard;
  }

  // Game Settings
  async getGameSettings(): Promise<{ subredditName: string }> {
    const data = await this.redis.get('game_settings');
    return data ? JSON.parse(data) : { subredditName: '' };
  }

  async setGameSettings(settings: { subredditName: string }): Promise<void> {
    await this.redis.set('game_settings', JSON.stringify(settings));
  }

  // Post Type Management
  async setPostType(postId: string, type: 'game' | 'pinned'): Promise<void> {
    await this.redis.set(`post_type:${postId}`, type);
  }

  async getPostType(postId: string): Promise<'game' | 'pinned' | null> {
    const type = await this.redis.get(`post_type:${postId}`);
    return type as 'game' | 'pinned' | null;
  }

  async setPinnedPost(postId: string): Promise<void> {
    await this.redis.set('pinned_post', postId);
  }

  async getPinnedPost(): Promise<string | null> {
    return await this.redis.get('pinned_post');
  }

  // Utility Methods
  private getWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }

  private getLevelByExperience(experience: number): { level: number; name: string } {
    const levels = [
      { level: 1, name: 'Rookie Detective', experienceRequired: 1 },
      { level: 2, name: 'Truth Seeker', experienceRequired: 10 },
      { level: 3, name: 'Lie Detector', experienceRequired: 20 },
      { level: 4, name: 'Master Sleuth', experienceRequired: 35 },
      { level: 5, name: 'Truth Master', experienceRequired: 55 },
      { level: 6, name: 'Carnival Legend', experienceRequired: 80 },
      { level: 7, name: 'Ultimate Detective', experienceRequired: 110 },
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (experience >= levels[i].experienceRequired) {
        return levels[i];
      }
    }
    return levels[0];
  }

  async awardExperience(userId: string, username: string, points: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const userScore = await this.getUserScore(userId);
    userScore.username = username;
    userScore.experience += points;
    
    return await this.updateUserScore(userScore);
  }

  async awardGuesserPoints(userId: string, username: string, points: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const userScore = await this.getUserScore(userId);
    userScore.username = username;
    userScore.guesserPoints += points;
    userScore.weeklyGuesserPoints += points;
    userScore.totalGames += 1;
    if (points > 0) userScore.correctGuesses += 1;
    
    return await this.updateUserScore(userScore);
  }

  async awardLiarPoints(userId: string, username: string, points: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const userScore = await this.getUserScore(userId);
    userScore.username = username;
    userScore.liarPoints += points;
    userScore.weeklyLiarPoints += points;
    
    return await this.updateUserScore(userScore);
  }
}

// Carnival theme settings
const CarnivalTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#93c5fd',
    accent: '#FFD700',
    success: '#32CD32',
    danger: '#FF4444',
    warning: '#FFA500',
    background: '#F0F8FF',
    shadow: '#C0C0C0',
    text: '#000000',
    textLight: '#666666',
    white: '#FFFFFF',
  },
};

// Create the carnival striped background
const createCarnivalBackground = () => {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <defs>
        <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="56.57" height="56.57" patternTransform="rotate(45)">
          <rect width="28.28" height="56.57" fill="#3b82f6"/>
          <rect x="28.28" width="28.28" height="56.57" fill="#93c5fd"/>
        </pattern>
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0.2"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#diagonalStripes)" opacity="0.9"/>
      <rect width="100%" height="100%" fill="white" filter="url(#noiseFilter)" opacity="0.2"/>
    </svg>
  `)}`;
};

// Reusable components
const CarnivalCard = ({ children, borderColor = CarnivalTheme.colors.shadow }: { children: JSX.Element | JSX.Element[], borderColor?: string }) => (
  <vstack 
    backgroundColor="rgba(255,255,255,0.95)" 
    cornerRadius="large" 
    padding="large"
    border="thick"
    borderColor={borderColor}
    gap="medium"
  >
    {children}
  </vstack>
);

const CarnivalBackground = ({ children }: { children: JSX.Element | JSX.Element[] }) => (
  <zstack width="100%" height="100%">
    <image
      url={createCarnivalBackground()}
      imageHeight={400}
      imageWidth={400}
      height="100%"
      width="100%"
      resizeMode="cover"
      description="Carnival striped background with diagonal blue stripes and noise texture"
    />
    {children}
  </zstack>
);

// Add the custom post type
Devvit.addCustomPostType({
  name: 'ttol',
  height: 'tall',
  render: (context) => {
    const { postId, userId, redis, reddit } = context;
    const gameService = new GameService(redis);
    
    const [gameState, setGameState] = useState<'loading' | 'create' | 'play' | 'result' | 'leaderboard' | 'error'>('loading');
    const [error, setError] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'guessers' | 'liars'>('guessers');

    // Load initial data
    const { data: initialData, loading } = useAsync(async () => {
      try {
        let postType = await gameService.getPostType(postId);
        
        if (!postType) {
          const pinnedPostId = await gameService.getPinnedPost();
          if (pinnedPostId === postId) {
            postType = 'pinned';
            await gameService.setPostType(postId, 'pinned');
          } else {
            postType = 'game';
            await gameService.setPostType(postId, 'game');
          }
        }
        
        if (postType === 'pinned') {
          const [guesserLeaderboard, liarLeaderboard] = await Promise.all([
            gameService.getLeaderboard('guesser', 'alltime', 10),
            gameService.getLeaderboard('liar', 'alltime', 10),
          ]);

          let userStats: UserScore | undefined;
          if (userId) {
            userStats = await gameService.getUserScore(userId);
          }

          return {
            type: 'pinned' as const,
            leaderboard: { guesserLeaderboard, liarLeaderboard, userStats },
          };
        } else if (postType === 'game') {
          let gamePost = await gameService.getGamePost(postId);
          
          if (!gamePost) {
            return {
              type: 'new-game' as const,
            };
          }

          let hasGuessed = false;
          let userGuess: UserGuess | undefined;
          
          if (userId) {
            userGuess = await gameService.getUserGuess(postId, userId);
            hasGuessed = userGuess !== null;
          }

          return {
            type: 'game' as const,
            gamePost,
            hasGuessed,
            userGuess,
          };
        } else {
          throw new Error('Unknown post type');
        }
      } catch (err) {
        console.error('Error loading data:', err);
        throw err;
      }
    });

    // Create game form
    const createGameForm = useForm(
      {
        title: '🎪 Create Your Two Truths One Lie Game',
        description: 'Create two true statements and one lie. Players will try to guess which statement is false!',
        acceptLabel: 'Create Game Post! 🎪',
        cancelLabel: 'Cancel',
        fields: [
          {
            type: 'paragraph',
            name: 'truth1',
            label: 'Truth #1 ✅',
            helpText: 'Enter your first true statement',
            required: true,
          },
          {
            type: 'string',
            name: 'truth1Description',
            label: 'Truth #1 Details (Optional)',
            helpText: 'Add details to make it more believable',
            required: false,
          },
          {
            type: 'paragraph',
            name: 'truth2',
            label: 'Truth #2 ✅',
            helpText: 'Enter your second true statement',
            required: true,
          },
          {
            type: 'string',
            name: 'truth2Description',
            label: 'Truth #2 Details (Optional)',
            helpText: 'Add details to make it more believable',
            required: false,
          },
          {
            type: 'paragraph',
            name: 'lie',
            label: 'The Lie ❌',
            helpText: 'Enter your convincing lie',
            required: true,
          },
        ],
      },
      async (values) => {
        try {
          if (!userId || !reddit) {
            context.ui.showToast('Must be logged in to create a game');
            return;
          }

          const user = await reddit.getCurrentUser();
          if (!user) {
            context.ui.showToast('Unable to get user information');
            return;
          }

          const userScore = await gameService.getUserScore(userId);
          if (userScore.level < 1 && userScore.experience < 1) {
            context.ui.showToast('You must reach level 1 by playing at least one game before creating your own post');
            return;
          }

          const lieIndex = Math.floor(Math.random() * 3);
          
          const truth1: Statement = {
            text: values.truth1!,
            description: values.truth1Description || undefined,
          };
          const truth2: Statement = {
            text: values.truth2!,
            description: values.truth2Description || undefined,
          };
          const lie: Statement = {
            text: values.lie!,
          };

          const gamePost: GamePost = {
            postId,
            authorId: userId,
            authorUsername: user.username,
            truth1,
            truth2,
            lie,
            lieIndex,
            createdAt: Date.now(),
            totalGuesses: 0,
            correctGuesses: 0,
            guessBreakdown: [0, 0, 0],
          };

          await gameService.createGamePost(gamePost);
          await gameService.setPostType(postId, 'game');

          context.ui.showToast('Game created successfully! 🎪');
          setGameState('loading');
        } catch (error) {
          console.error('Error creating game:', error);
          context.ui.showToast('Error creating game. Please try again.');
        }
      }
    );

    // Handle loading state
    if (loading) {
      return (
        <blocks height="tall">
          <CarnivalBackground>
            <vstack width="100%" height="100%" alignment="center middle" padding="large">
              <CarnivalCard>
                <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪</text>
                <text size="large" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                  Loading Two Truths One Lie...
                </text>
              </CarnivalCard>
            </vstack>
          </CarnivalBackground>
        </blocks>
      );
    }

    // Handle error state
    if (!initialData) {
      return (
        <blocks height="tall">
          <CarnivalBackground>
            <vstack width="100%" height="100%" alignment="center middle" padding="large">
              <CarnivalCard borderColor={CarnivalTheme.colors.danger}>
                <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>⚠️</text>
                <text size="large" weight="bold" color={CarnivalTheme.colors.danger} alignment="center">
                  Error Loading Game
                </text>
                <text color={CarnivalTheme.colors.text} alignment="center">
                  {error || 'Something went wrong. Please try again.'}
                </text>
                <button
                  appearance="destructive"
                  onPress={() => {
                    setError('');
                    setGameState('loading');
                  }}
                >
                  <text color={CarnivalTheme.colors.white} weight="bold">Retry</text>
                </button>
              </CarnivalCard>
            </vstack>
          </CarnivalBackground>
        </blocks>
      );
    }

    // New game post that needs to be configured
    if (initialData.type === 'new-game') {
      return (
        <blocks height="tall">
          <CarnivalBackground>
            <vstack width="100%" height="100%" alignment="center middle" padding="large">
              <CarnivalCard>
                <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪</text>
                <text size="xlarge" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                  Configure Your Game
                </text>
                <text alignment="center" color={CarnivalTheme.colors.text}>
                  This post needs to be configured with your Two Truths One Lie game!
                </text>
                
                <vstack gap="small" padding="medium" backgroundColor={CarnivalTheme.colors.background} cornerRadius="medium">
                  <text weight="bold" color={CarnivalTheme.colors.text}>Ready to create your game?</text>
                  <text size="small" color={CarnivalTheme.colors.textLight}>
                    Create two true statements and one convincing lie!
                  </text>
                </vstack>

                <button
                  appearance="primary"
                  onPress={() => context.ui.showForm(createGameForm)}
                >
                  <text color={CarnivalTheme.colors.white} weight="bold">Create Your Game! 🎪</text>
                </button>
              </CarnivalCard>
            </vstack>
          </CarnivalBackground>
        </blocks>
      );
    }

    // Pinned post (community hub)
    if (initialData.type === 'pinned') {
      const { leaderboard } = initialData;
      
      if (gameState === 'create') {
        return (
          <blocks height="tall">
            <CarnivalBackground>
              <vstack width="100%" height="100%" alignment="center middle" padding="large">
                <CarnivalCard>
                  <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
                  <text alignment="center" color={CarnivalTheme.colors.text}>
                    Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.
                  </text>
                  
                  <hstack gap="medium">
                    <button
                      appearance="secondary"
                      onPress={() => setGameState('leaderboard')}
                    >
                      <text color={CarnivalTheme.colors.text} weight="bold">Back</text>
                    </button>
                    <button
                      appearance="primary"
                      onPress={async () => {
                        context.ui.showToast('Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.');
                      }}
                    >
                      <text color={CarnivalTheme.colors.white} weight="bold">Create Game Post!</text>
                    </button>
                  </hstack>
                </CarnivalCard>
              </vstack>
            </CarnivalBackground>
          </blocks>
        );
      }

      // Leaderboard view (default for pinned post)
      const currentLeaderboard = activeTab === 'guessers' 
        ? leaderboard.guesserLeaderboard 
        : leaderboard.liarLeaderboard;

      return (
        <blocks height="tall">
          <CarnivalBackground>
            <vstack width="100%" height="100%" padding="large" gap="medium">
              <CarnivalCard>
                <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🏆 Two Truths One Lie</text>
                <text alignment="center" color={CarnivalTheme.colors.textLight}>
                  Welcome to the carnival of deception! Can you spot the lies?
                </text>

                {/* User Stats */}
                {leaderboard.userStats && (
                  <vstack 
                    padding="medium" 
                    backgroundColor={CarnivalTheme.colors.background} 
                    cornerRadius="medium" 
                    border="thin" 
                    borderColor={CarnivalTheme.colors.primary}
                  >
                    <text weight="bold" color={CarnivalTheme.colors.text}>Your Stats</text>
                    <hstack gap="large">
                      <vstack>
                        <text size="small" color={CarnivalTheme.colors.text}>
                          Level {leaderboard.userStats.level}
                        </text>
                        <text size="small" color={CarnivalTheme.colors.text}>
                          {leaderboard.userStats.experience} XP
                        </text>
                      </vstack>
                      <vstack>
                        <text size="small" color={CarnivalTheme.colors.text}>
                          Games: {leaderboard.userStats.totalGames}
                        </text>
                        <text size="small" color={CarnivalTheme.colors.text}>
                          Accuracy: {leaderboard.userStats.totalGames > 0 
                            ? Math.round((leaderboard.userStats.correctGuesses / leaderboard.userStats.totalGames) * 100) 
                            : 0}%
                        </text>
                      </vstack>
                    </hstack>
                  </vstack>
                )}

                {/* Tab Navigation */}
                <hstack gap="small">
                  <button
                    appearance={activeTab === 'guessers' ? 'primary' : 'secondary'}
                    onPress={() => setActiveTab('guessers')}
                  >
                    <text color={activeTab === 'guessers' ? CarnivalTheme.colors.white : CarnivalTheme.colors.text} weight="bold">
                      🕵️ Best Guessers
                    </text>
                  </button>
                  <button
                    appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
                    onPress={() => setActiveTab('liars')}
                  >
                    <text color={activeTab === 'liars' ? CarnivalTheme.colors.white : CarnivalTheme.colors.text} weight="bold">
                      🎭 Best Liars
                    </text>
                  </button>
                </hstack>

                {/* Leaderboard */}
                <vstack gap="small">
                  {currentLeaderboard.length > 0 ? (
                    currentLeaderboard.map((entry, index) => (
                      <hstack 
                        key={entry.userId} 
                        padding="small" 
                        backgroundColor={CarnivalTheme.colors.background} 
                        cornerRadius="medium"
                        border="thin"
                        borderColor={CarnivalTheme.colors.shadow}
                      >
                        <text weight="bold" width="40px" color={CarnivalTheme.colors.text}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </text>
                        <text grow color={CarnivalTheme.colors.text}>u/{entry.username}</text>
                        <text weight="bold" color={CarnivalTheme.colors.text}>{entry.score}</text>
                      </hstack>
                    ))
                  ) : (
                    <vstack alignment="center middle" padding="large">
                      <text size="large" color={CarnivalTheme.colors.text}>🎪</text>
                      <text color={CarnivalTheme.colors.textLight}>No entries yet! Be the first to play!</text>
                    </vstack>
                  )}
                </vstack>

                {/* Action Button */}
                <button
                  appearance="primary"
                  onPress={() => setGameState('create')}
                >
                  <text color={CarnivalTheme.colors.white} weight="bold">Create Your Game 🎪</text>
                </button>
              </CarnivalCard>
            </vstack>
          </CarnivalBackground>
        </blocks>
      );
    }

    // Game post
    if (initialData.type === 'game') {
      const { gamePost, hasGuessed, userGuess } = initialData;
      const statements = [gamePost.truth1, gamePost.truth2, gamePost.lie];

      // Game play interface
      if (!hasGuessed) {
        return (
          <blocks height="tall">
            <CarnivalBackground>
              <vstack width="100%" height="100%" padding="large" gap="medium">
                <CarnivalCard>
                  <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Two Truths One Lie</text>
                  <text alignment="center" color={CarnivalTheme.colors.textLight}>
                    Can you spot the lie? Choose the statement you think is false!
                  </text>
                  <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
                    By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
                  </text>

                  <vstack gap="small">
                    {statements.map((statement, index) => (
                      <vstack
                        key={index}
                        padding="medium"
                        backgroundColor={selectedIndex === index ? CarnivalTheme.colors.accent : CarnivalTheme.colors.background}
                        cornerRadius="large"
                        border="thick"
                        borderColor={selectedIndex === index ? CarnivalTheme.colors.primary : CarnivalTheme.colors.shadow}
                        onPress={() => setSelectedIndex(index)}
                      >
                        <text alignment="start" color={CarnivalTheme.colors.text} weight="bold">
                          {statement.text}
                        </text>
                      </vstack>
                    ))}
                  </vstack>

                  <button
                    appearance="primary"
                    onPress={async () => {
                      if (selectedIndex === null || !userId || !reddit) return;

                      try {
                        const existingGuess = await gameService.getUserGuess(postId, userId);
                        if (existingGuess) {
                          context.ui.showToast('You have already guessed on this post');
                          return;
                        }

                        if (gamePost.authorId === userId) {
                          context.ui.showToast('You cannot guess on your own post');
                          return;
                        }

                        const user = await reddit.getCurrentUser();
                        if (!user) {
                          context.ui.showToast('Unable to get user information');
                          return;
                        }

                        const isCorrect = selectedIndex === gamePost.lieIndex;
                        
                        const newUserGuess: UserGuess = {
                          userId,
                          username: user.username,
                          postId,
                          guessIndex: selectedIndex,
                          isCorrect,
                          timestamp: Date.now(),
                        };

                        gamePost.totalGuesses += 1;
                        gamePost.guessBreakdown[selectedIndex] += 1;
                        if (isCorrect) {
                          gamePost.correctGuesses += 1;
                        }

                        const experiencePoints = isCorrect ? 4 : 1;
                        const guesserPoints = isCorrect ? 1 : 0;
                        
                        await Promise.all([
                          gameService.saveUserGuess(newUserGuess),
                          gameService.updateGamePost(gamePost),
                          gameService.awardExperience(userId, user.username, experiencePoints),
                          gameService.awardGuesserPoints(userId, user.username, guesserPoints),
                        ]);

                        if (!isCorrect) {
                          await gameService.awardLiarPoints(gamePost.authorId, gamePost.authorUsername, 1);
                        }

                        const userScore = await gameService.getUserScore(userId);
                        const newLevel = gameService.getLevelByExperience(userScore.experience);
                        
                        if (newLevel.level > userScore.level) {
                          userScore.level = newLevel.level;
                          await gameService.updateUserScore(userScore);
                          context.ui.showToast(`Level up! You are now ${newLevel.name}!`);
                        }

                        context.ui.showToast(isCorrect ? '🎉 Correct! You spotted the lie!' : '😅 Wrong! Better luck next time!');
                        
                        setGameState('result');
                      } catch (err) {
                        console.error('Error submitting guess:', err);
                        context.ui.showToast('Error submitting guess. Please try again.');
                      }
                    }}
                    disabled={selectedIndex === null}
                  >
                    <text color={CarnivalTheme.colors.white} weight="bold">Submit Guess! 🎯</text>
                  </button>
                </CarnivalCard>
              </vstack>
            </CarnivalBackground>
          </blocks>
        );
      }

      // Results interface
      return (
        <blocks height="tall">
          <CarnivalBackground>
            <vstack width="100%" height="100%" padding="large" gap="medium">
              <CarnivalCard>
                <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Results</text>
                <text alignment="center" color={CarnivalTheme.colors.text}>
                  {userGuess?.isCorrect 
                    ? '🎉 Congratulations! You spotted the lie!' 
                    : '😅 Nice try! Better luck next time!'
                  }
                </text>
                <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
                  By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
                </text>

                <vstack gap="small">
                  {statements.map((statement, index) => {
                    const isLie = index === gamePost.lieIndex;
                    const isUserChoice = userGuess?.guessIndex === index;
                    const votes = gamePost.guessBreakdown[index];
                    const percentage = gamePost.totalGuesses > 0 
                      ? Math.round((votes / gamePost.totalGuesses) * 100) 
                      : 0;

                    return (
                      <vstack 
                        key={index} 
                        padding="medium" 
                        backgroundColor={isLie ? "rgba(255,68,68,0.2)" : "rgba(50,205,50,0.2)"} 
                        cornerRadius="medium"
                        border="thick"
                        borderColor={isLie ? CarnivalTheme.colors.danger : CarnivalTheme.colors.success}
                      >
                        <hstack>
                          <text grow weight="bold" color={CarnivalTheme.colors.text}>
                            {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                          </text>
                          {isUserChoice && (
                            <text color={CarnivalTheme.colors.primary} weight="bold">(Your choice)</text>
                          )}
                        </hstack>
                        
                        {!isLie && statement.description && (
                          <text size="small" color={CarnivalTheme.colors.textLight}>
                            Details: {statement.description}
                          </text>
                        )}
                        
                        <text size="small" color={CarnivalTheme.colors.textLight}>
                          {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                        </text>
                      </vstack>
                    );
                  })}
                </vstack>

                <text alignment="center" color={CarnivalTheme.colors.text}>
                  💬 How surprising were the truths? Comment below!
                </text>

                <button
                  appearance="secondary"
                  onPress={() => setGameState('leaderboard')}
                >
                  <text color={CarnivalTheme.colors.text} weight="bold">View Leaderboard 🏆</text>
                </button>
              </CarnivalCard>
            </vstack>
          </CarnivalBackground>
        </blocks>
      );
    }

    // Fallback
    return (
      <blocks height="tall">
        <CarnivalBackground>
          <vstack width="100%" height="100%" alignment="center middle" padding="large">
            <CarnivalCard>
              <text color={CarnivalTheme.colors.text}>Unknown state</text>
            </CarnivalCard>
          </vstack>
        </CarnivalBackground>
      </blocks>
    );
  },
});

// Menu item for creating new posts
Devvit.addMenuItem({
  label: '[TTOL] New Two Truths One Lie Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Can You Spot the Lie? 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🎪</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Ready to create your game...</text>
            </vstack>
          </blocks>
        ),
      });
      
      await gameService.setPostType(post.id, 'game');
      
      ui.showToast({ text: 'Created Two Truths One Lie post! Click on it to configure your game.' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error creating post:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error creating post!',
      });
    }
  },
});

// Menu item for installing the game
Devvit.addMenuItem({
  label: '[TTOL] Install Game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Community Hub 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🏆</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Community Hub</text>
            </vstack>
          </blocks>
        ),
      });
      
      await Promise.all([
        post.sticky(),
        gameService.setPinnedPost(post.id),
        gameService.setPostType(post.id, 'pinned'),
        gameService.setGameSettings({ subredditName: subreddit.name }),
      ]);
      
      ui.showToast({ text: 'Installed Two Truths One Lie!' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error installing game:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error installing game!',
      });
    }
  },
});

export default Devvit;