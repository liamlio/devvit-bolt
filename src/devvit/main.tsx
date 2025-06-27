import { Devvit, useState, useAsync, useForm } from '@devvit/public-api';
import { GameService } from '../server/core/game';
import type { GamePost, UserGuess, UserScore, LeaderboardEntry, Statement } from '../shared/types/game';
import { getLevelByExperience, LEVELS } from '../server/core/levels';

// Configure Devvit
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
});

// Carnival theme settings
const CarnivalTheme = {
  colors: {
    primary: '#4A90E2',
    secondary: '#87CEEB', 
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
  background: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3Cpattern id='stripes' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Crect width='20' height='40' fill='%234A90E2'/%3E%3Crect x='20' width='20' height='40' fill='%2387CEEB'/%3E%3C/pattern%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='1' result='noise'/%3E%3CfeColorMatrix in='noise' type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0.1'/%3E%3C/feComponentTransfer%3E%3CfeComposite operator='over' in2='SourceGraphic'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23stripes)'/%3E%3Crect width='100%25' height='100%25' fill='url(%23stripes)' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E`,
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
      url={CarnivalTheme.background}
      imageHeight={400}
      imageWidth={400}
      height="100%"
      width="100%"
      resizeMode="cover"
    />
    {children}
  </zstack>
);

const CarnivalButton = ({ 
  children, 
  onPress, 
  appearance = 'primary', 
  disabled = false,
  size = 'medium'
}: { 
  children: JSX.Element | string, 
  onPress?: () => void | Promise<void>, 
  appearance?: 'primary' | 'secondary' | 'success' | 'danger',
  disabled?: boolean,
  size?: 'small' | 'medium' | 'large'
}) => {
  const colors = {
    primary: { bg: CarnivalTheme.colors.primary, text: CarnivalTheme.colors.white },
    secondary: { bg: CarnivalTheme.colors.background, text: CarnivalTheme.colors.text },
    success: { bg: CarnivalTheme.colors.success, text: CarnivalTheme.colors.white },
    danger: { bg: CarnivalTheme.colors.danger, text: CarnivalTheme.colors.white },
  };

  const buttonColor = colors[appearance];
  
  return (
    <button
      onPress={disabled ? undefined : onPress}
      appearance={appearance}
      size={size}
      disabled={disabled}
    >
      <text color={buttonColor.text} weight="bold">
        {typeof children === 'string' ? children : children}
      </text>
    </button>
  );
};

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
        // First check if this post has a type set
        let postType = await gameService.getPostType(postId);
        
        // If no post type is set, check if this is a pinned post
        if (!postType) {
          const pinnedPostId = await gameService.getPinnedPost();
          if (pinnedPostId === postId) {
            postType = 'pinned';
            await gameService.setPostType(postId, 'pinned');
          } else {
            // Default to game post for new posts
            postType = 'game';
            await gameService.setPostType(postId, 'game');
          }
        }
        
        if (postType === 'pinned') {
          // This is the pinned community post
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
          // This is a game post - check if it exists, if not create a placeholder
          let gamePost = await gameService.getGamePost(postId);
          
          if (!gamePost) {
            // This is a new game post that hasn't been configured yet
            // Show the creation interface
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

          // Get current user info
          const user = await reddit.getCurrentUser();
          if (!user) {
            context.ui.showToast('Unable to get user information');
            return;
          }

          // Check if user has required level
          const userScore = await gameService.getUserScore(userId);
          if (userScore.level < 1 && userScore.experience < 1) {
            context.ui.showToast('You must reach level 1 by playing at least one game before creating your own post');
            return;
          }

          // Randomly assign lie position
          const lieIndex = Math.floor(Math.random() * 3);
          
          // Create statements
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

          // Create game post data
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

          // Save to Redis
          await gameService.createGamePost(gamePost);
          await gameService.setPostType(postId, 'game');

          // Schedule post preview update if scheduler is available
          if (context.scheduler) {
            await context.scheduler.runJob({
              name: 'UpdatePostPreview',
              data: { postId },
              runAt: new Date(Date.now() + 1000),
            });
          }

          context.ui.showToast('Game created successfully! 🎪');
          setGameState('loading'); // Trigger reload
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
                <CarnivalButton
                  appearance="danger"
                  onPress={() => {
                    setError('');
                    setGameState('loading');
                  }}
                >
                  Retry
                </CarnivalButton>
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

                <CarnivalButton
                  appearance="primary"
                  onPress={() => context.ui.showForm(createGameForm)}
                >
                  Create Your Game! 🎪
                </CarnivalButton>
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
                    <CarnivalButton
                      appearance="secondary"
                      onPress={() => setGameState('leaderboard')}
                    >
                      Back
                    </CarnivalButton>
                    <CarnivalButton
                      appearance="primary"
                      onPress={async () => {
                        context.ui.showToast('Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.');
                      }}
                    >
                      Create Game Post!
                    </CarnivalButton>
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
                  <CarnivalButton
                    appearance={activeTab === 'guessers' ? 'primary' : 'secondary'}
                    onPress={() => setActiveTab('guessers')}
                  >
                    🕵️ Best Guessers
                  </CarnivalButton>
                  <CarnivalButton
                    appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
                    onPress={() => setActiveTab('liars')}
                  >
                    🎭 Best Liars
                  </CarnivalButton>
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
                <CarnivalButton
                  appearance="primary"
                  onPress={() => setGameState('create')}
                >
                  Create Your Game 🎪
                </CarnivalButton>
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

                  <CarnivalButton
                    appearance="primary"
                    onPress={async () => {
                      if (selectedIndex === null || !userId || !reddit) return;

                      try {
                        // Check if user already guessed
                        const existingGuess = await gameService.getUserGuess(postId, userId);
                        if (existingGuess) {
                          context.ui.showToast('You have already guessed on this post');
                          return;
                        }

                        // Check if user is the author
                        if (gamePost.authorId === userId) {
                          context.ui.showToast('You cannot guess on your own post');
                          return;
                        }

                        // Get current user info
                        const user = await reddit.getCurrentUser();
                        if (!user) {
                          context.ui.showToast('Unable to get user information');
                          return;
                        }

                        // Process the guess
                        const isCorrect = selectedIndex === gamePost.lieIndex;
                        
                        // Create user guess record
                        const newUserGuess: UserGuess = {
                          userId,
                          username: user.username,
                          postId,
                          guessIndex: selectedIndex,
                          isCorrect,
                          timestamp: Date.now(),
                        };

                        // Update game post stats
                        gamePost.totalGuesses += 1;
                        gamePost.guessBreakdown[selectedIndex] += 1;
                        if (isCorrect) {
                          gamePost.correctGuesses += 1;
                        }

                        // Award experience points (1 for playing, +3 for correct guess)
                        const experiencePoints = isCorrect ? 4 : 1;
                        const guesserPoints = isCorrect ? 1 : 0;
                        
                        // Save data and award points
                        await Promise.all([
                          gameService.saveUserGuess(newUserGuess),
                          gameService.updateGamePost(gamePost),
                          gameService.awardExperience(userId, user.username, experiencePoints),
                          gameService.awardGuesserPoints(userId, user.username, guesserPoints),
                        ]);

                        // Award liar points to the author if guess was wrong
                        if (!isCorrect) {
                          await gameService.awardLiarPoints(gamePost.authorId, gamePost.authorUsername, 1);
                        }

                        // Check for level up
                        const userScore = await gameService.getUserScore(userId);
                        const newLevel = getLevelByExperience(userScore.experience);
                        
                        if (newLevel.level > userScore.level) {
                          // Update user level
                          userScore.level = newLevel.level;
                          await gameService.updateUserScore(userScore);
                          
                          // Schedule flair update
                          if (context.scheduler) {
                            await context.scheduler.runJob({
                              name: 'UpdateUserFlair',
                              data: { userId, username: user.username, level: newLevel.level },
                              runAt: new Date(Date.now() + 1000),
                            });
                          }
                          
                          context.ui.showToast(`Level up! You are now ${newLevel.name}!`);
                        }

                        // Show result
                        context.ui.showToast(isCorrect ? '🎉 Correct! You spotted the lie!' : '😅 Wrong! Better luck next time!');
                        
                        // Refresh the view to show results
                        setGameState('result');
                      } catch (err) {
                        console.error('Error submitting guess:', err);
                        context.ui.showToast('Error submitting guess. Please try again.');
                      }
                    }}
                    disabled={selectedIndex === null}
                  >
                    Submit Guess! 🎯
                  </CarnivalButton>
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

                <CarnivalButton
                  appearance="secondary"
                  onPress={() => setGameState('leaderboard')}
                >
                  View Leaderboard 🏆
                </CarnivalButton>
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

// Menu item for creating new posts - AUTOMATICALLY CREATES THE POST
Devvit.addMenuItem({
  label: '[TTOL] New Two Truths One Lie Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      // Automatically create the post
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
      
      // Set as game post type
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
      
      // Create pinned community post
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
      
      // Pin the post and save settings
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

// Scheduler job for updating user flair
Devvit.addSchedulerJob({
  name: 'UpdateUserFlair',
  onRun: async (event, context) => {
    if (!event.data) return;
    
    const { userId, username, level } = event.data as { userId: string; username: string; level: number };
    const { reddit, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const settings = await gameService.getGameSettings();
      
      if (!settings.subredditName) {
        console.error('No subreddit name in settings');
        return;
      }
      
      const levelData = LEVELS.find(l => l.level === level);
      if (!levelData) {
        console.error('Level data not found for level:', level);
        return;
      }
      
      await reddit.setUserFlair({
        subredditName: settings.subredditName,
        username,
        text: levelData.flairText,
        backgroundColor: levelData.flairColor,
        textColor: 'light',
      });
      
      console.log(`Updated flair for ${username} to level ${level}`);
    } catch (error) {
      console.error('Error updating user flair:', error);
    }
  },
});

// Scheduler job for updating post preview
Devvit.addSchedulerJob({
  name: 'UpdatePostPreview',
  onRun: async (event, context) => {
    if (!event.data) return;
    
    const { postId } = event.data as { postId: string };
    const { reddit, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const gamePost = await gameService.getGamePost(postId);
      
      if (!gamePost) {
        console.error('Game post not found for preview update:', postId);
        return;
      }
      
      const post = await reddit.getPostById(postId);
      await post.setCustomPostPreview(() => (
        <blocks>
          <vstack padding="medium" gap="small">
            <text size="large" weight="bold" alignment="center">🎪 Two Truths One Lie</text>
            <text alignment="center" color="neutral-content-weak">
              Can you spot the lie?
            </text>
            <text size="small" alignment="center" color="neutral-content-weak">
              By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
            </text>
          </vstack>
        </blocks>
      ));
      
      console.log(`Updated preview for post ${postId}`);
    } catch (error) {
      console.error('Error updating post preview:', error);
    }
  },
});

export default Devvit;