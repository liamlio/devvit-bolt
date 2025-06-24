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

// Carnival theme SVG background - blue and light blue striped tent with noise texture
const carnivalBackground = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3Cpattern id='stripes' patternUnits='userSpaceOnUse' width='40' height='40'%3E%3Crect width='20' height='40' fill='%234A90E2'/%3E%3Crect x='20' width='20' height='40' fill='%2387CEEB'/%3E%3C/pattern%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='1' result='noise'/%3E%3CfeColorMatrix in='noise' type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0.1'/%3E%3C/feComponentTransfer%3E%3CfeComposite operator='over' in2='SourceGraphic'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23stripes)'/%3E%3Crect width='100%25' height='100%25' fill='url(%23stripes)' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E`;

// Carnival button component for Devvit
const CarnivalButton = ({ 
  children, 
  onPress, 
  appearance = 'primary', 
  size = 'medium',
  disabled = false 
}: {
  children: string;
  onPress?: () => void;
  appearance?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}) => {
  const colors = {
    primary: '#FFD700', // Yellow for primary actions
    secondary: '#C0C0C0', // Silver for secondary
    success: '#32CD32', // Green for success
    danger: '#FF4444', // Red for danger/lies
  };

  return (
    <button
      onPress={onPress}
      appearance="bordered"
      size={size}
      disabled={disabled}
    >
      <hstack 
        backgroundColor={colors[appearance]} 
        cornerRadius="large" 
        padding="medium"
        alignment="center middle"
      >
        <text color="black" weight="bold" size={size}>
          {children}
        </text>
      </hstack>
    </button>
  );
};

// Carnival card component
const CarnivalCard = ({ children, backgroundColor = "white" }: { children: JSX.Element; backgroundColor?: string }) => (
  <vstack 
    backgroundColor={backgroundColor} 
    cornerRadius="large" 
    padding="large" 
    gap="medium"
    border="thick"
    borderColor="#C0C0C0"
  >
    {children}
  </vstack>
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
        <blocks>
          <zstack width="100%" height="100%" alignment="center middle">
            {/* Carnival striped background */}
            <image
              url={carnivalBackground}
              imageHeight={400}
              imageWidth={400}
              height="100%"
              width="100%"
              resizeMode="cover"
            />
            <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
              <vstack alignment="center middle" gap="medium">
                <text size="xxlarge">🎪</text>
                <text size="large" weight="bold" color="black">Loading Two Truths One Lie...</text>
              </vstack>
            </CarnivalCard>
          </zstack>
        </blocks>
      );
    }

    // Handle error state
    if (!initialData) {
      return (
        <blocks>
          <zstack width="100%" height="100%" alignment="center middle">
            <image
              url={carnivalBackground}
              imageHeight={400}
              imageWidth={400}
              height="100%"
              width="100%"
              resizeMode="cover"
            />
            <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
              <vstack alignment="center middle" gap="medium" padding="large">
                <text size="xxlarge">⚠️</text>
                <text size="large" weight="bold" color="#FF4444">Error Loading Game</text>
                <text color="black" alignment="center">
                  {error || 'Something went wrong. Please try again.'}
                </text>
                <button
                  onPress={() => {
                    setError('');
                    setGameState('loading');
                  }}
                  appearance="primary"
                >
                  <hstack backgroundColor="#FFD700" cornerRadius="large" padding="medium">
                    <text color="black" weight="bold">Retry</text>
                  </hstack>
                </button>
              </vstack>
            </CarnivalCard>
          </zstack>
        </blocks>
      );
    }

    // New game post that needs to be configured
    if (initialData.type === 'new-game') {
      return (
        <blocks>
          <zstack width="100%" height="100%">
            {/* Carnival striped background */}
            <image
              url={carnivalBackground}
              imageHeight={400}
              imageWidth={400}
              height="100%"
              width="100%"
              resizeMode="cover"
            />
            <vstack padding="large" gap="medium" alignment="center middle">
              <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
                <vstack alignment="center middle" gap="medium">
                  <text size="xxlarge" alignment="center">🎪</text>
                  <text size="xlarge" weight="bold" color="black" alignment="center">Configure Your Game</text>
                  <text alignment="center" color="black">
                    This post needs to be configured with your Two Truths One Lie game!
                  </text>
                  
                  <vstack gap="small" padding="medium" backgroundColor="#F0F8FF" cornerRadius="medium">
                    <text weight="bold" color="black">Ready to create your game?</text>
                    <text size="small" color="black">Create two true statements and one convincing lie!</text>
                  </vstack>

                  <button
                    onPress={() => context.ui.showForm(createGameForm)}
                    appearance="primary"
                    size="large"
                  >
                    <hstack backgroundColor="#FFD700" cornerRadius="large" padding="large">
                      <text color="black" weight="bold" size="large">Create Your Game! 🎪</text>
                    </hstack>
                  </button>
                </vstack>
              </CarnivalCard>
            </vstack>
          </zstack>
        </blocks>
      );
    }

    // Pinned post (community hub)
    if (initialData.type === 'pinned') {
      const { leaderboard } = initialData;
      
      if (gameState === 'create') {
        return (
          <blocks>
            <zstack width="100%" height="100%">
              {/* Carnival striped background */}
              <image
                url={carnivalBackground}
                imageHeight={400}
                imageWidth={400}
                height="100%"
                width="100%"
                resizeMode="cover"
              />
              <vstack padding="large" gap="medium">
                <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
                  <vstack alignment="center middle" gap="medium">
                    <text size="xxlarge" alignment="center" color="black">🎪 Create Your Game</text>
                    <text alignment="center" color="black">
                      Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.
                    </text>
                    
                    <hstack gap="medium">
                      <button
                        onPress={() => setGameState('leaderboard')}
                        appearance="secondary"
                        grow
                      >
                        <hstack backgroundColor="#C0C0C0" cornerRadius="large" padding="medium">
                          <text color="black" weight="bold">Back</text>
                        </hstack>
                      </button>
                      <button
                        onPress={async () => {
                          context.ui.showToast('Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.');
                        }}
                        appearance="primary"
                        grow
                      >
                        <hstack backgroundColor="#FFD700" cornerRadius="large" padding="medium">
                          <text color="black" weight="bold">Create Game Post!</text>
                        </hstack>
                      </button>
                    </hstack>
                  </vstack>
                </CarnivalCard>
              </vstack>
            </zstack>
          </blocks>
        );
      }

      // Leaderboard view (default for pinned post)
      const currentLeaderboard = activeTab === 'guessers' 
        ? leaderboard.guesserLeaderboard 
        : leaderboard.liarLeaderboard;

      return (
        <blocks>
          <zstack width="100%" height="100%">
            {/* Carnival striped background */}
            <image
              url={carnivalBackground}
              imageHeight={400}
              imageWidth={400}
              height="100%"
              width="100%"
              resizeMode="cover"
            />
            <vstack padding="large" gap="medium">
              <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
                <vstack gap="medium">
                  <text size="xxlarge" alignment="center" color="black">🏆 Two Truths One Lie</text>
                  <text alignment="center" color="black">
                    Welcome to the carnival of deception! Can you spot the lies?
                  </text>

                  {/* User Stats */}
                  {leaderboard.userStats && (
                    <vstack padding="medium" backgroundColor="#F0F8FF" cornerRadius="medium" border="thin" borderColor="#4A90E2">
                      <text weight="bold" color="black">Your Stats</text>
                      <hstack gap="large">
                        <vstack>
                          <text size="small" color="black">Level {leaderboard.userStats.level}</text>
                          <text size="small" color="black">{leaderboard.userStats.experience} XP</text>
                        </vstack>
                        <vstack>
                          <text size="small" color="black">Games: {leaderboard.userStats.totalGames}</text>
                          <text size="small" color="black">
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
                      onPress={() => setActiveTab('guessers')}
                      appearance={activeTab === 'guessers' ? 'primary' : 'secondary'}
                      grow
                    >
                      <hstack 
                        backgroundColor={activeTab === 'guessers' ? '#FFD700' : '#C0C0C0'} 
                        cornerRadius="large" 
                        padding="medium"
                      >
                        <text color="black" weight="bold">🕵️ Best Guessers</text>
                      </hstack>
                    </button>
                    <button
                      onPress={() => setActiveTab('liars')}
                      appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
                      grow
                    >
                      <hstack 
                        backgroundColor={activeTab === 'liars' ? '#FFD700' : '#C0C0C0'} 
                        cornerRadius="large" 
                        padding="medium"
                      >
                        <text color="black" weight="bold">🎭 Best Liars</text>
                      </hstack>
                    </button>
                  </hstack>

                  {/* Leaderboard */}
                  <vstack gap="small">
                    {currentLeaderboard.length > 0 ? (
                      currentLeaderboard.map((entry, index) => (
                        <hstack 
                          key={entry.userId} 
                          padding="small" 
                          backgroundColor="#F8F9FA" 
                          cornerRadius="medium"
                          border="thin"
                          borderColor="#C0C0C0"
                        >
                          <text weight="bold" width="40px" color="black">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </text>
                          <text grow color="black">u/{entry.username}</text>
                          <text weight="bold" color="black">{entry.score}</text>
                        </hstack>
                      ))
                    ) : (
                      <vstack alignment="center middle" padding="large">
                        <text size="large">🎪</text>
                        <text color="black">No entries yet! Be the first to play!</text>
                      </vstack>
                    )}
                  </vstack>

                  {/* Action Button */}
                  <button
                    onPress={() => setGameState('create')}
                    appearance="primary"
                    size="large"
                  >
                    <hstack backgroundColor="#FFD700" cornerRadius="large" padding="large">
                      <text color="black" weight="bold" size="large">Create Your Game 🎪</text>
                    </hstack>
                  </button>
                </vstack>
              </CarnivalCard>
            </vstack>
          </zstack>
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
          <blocks>
            <zstack width="100%" height="100%">
              {/* Carnival striped background */}
              <image
                url={carnivalBackground}
                imageHeight={400}
                imageWidth={400}
                height="100%"
                width="100%"
                resizeMode="cover"
              />
              <vstack padding="large" gap="medium">
                <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
                  <vstack gap="medium">
                    <text size="xxlarge" alignment="center" color="black">🎪 Two Truths One Lie</text>
                    <text alignment="center" color="black">
                      Can you spot the lie? Choose the statement you think is false!
                    </text>
                    <text size="small" alignment="center" color="#666">
                      By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
                    </text>

                    <vstack gap="small">
                      {statements.map((statement, index) => (
                        <button
                          key={index}
                          onPress={() => setSelectedIndex(index)}
                          appearance={selectedIndex === index ? 'primary' : 'secondary'}
                          size="large"
                        >
                          <hstack 
                            backgroundColor={selectedIndex === index ? '#FFD700' : '#F8F9FA'} 
                            cornerRadius="large" 
                            padding="medium"
                            border="thick"
                            borderColor={selectedIndex === index ? '#4A90E2' : '#C0C0C0'}
                          >
                            <text alignment="start" color="black" weight="bold">{statement.text}</text>
                          </hstack>
                        </button>
                      ))}
                    </vstack>

                    <button
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
                      appearance="primary"
                      size="large"
                      disabled={selectedIndex === null}
                    >
                      <hstack 
                        backgroundColor={selectedIndex === null ? '#C0C0C0' : '#32CD32'} 
                        cornerRadius="large" 
                        padding="large"
                      >
                        <text color="black" weight="bold" size="large">Submit Guess! 🎯</text>
                      </hstack>
                    </button>
                  </vstack>
                </CarnivalCard>
              </vstack>
            </zstack>
          </blocks>
        );
      }

      // Results interface
      return (
        <blocks>
          <zstack width="100%" height="100%">
            {/* Carnival striped background */}
            <image
              url={carnivalBackground}
              imageHeight={400}
              imageWidth={400}
              height="100%"
              width="100%"
              resizeMode="cover"
            />
            <vstack padding="large" gap="medium">
              <CarnivalCard backgroundColor="rgba(255,255,255,0.95)">
                <vstack gap="medium">
                  <text size="xxlarge" alignment="center" color="black">🎪 Results</text>
                  <text alignment="center" color="black">
                    {userGuess?.isCorrect 
                      ? '🎉 Congratulations! You spotted the lie!' 
                      : '😅 Nice try! Better luck next time!'
                    }
                  </text>
                  <text size="small" alignment="center" color="#666">
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
                          borderColor={isLie ? "#FF4444" : "#32CD32"}
                        >
                          <hstack>
                            <text grow weight="bold" color="black">
                              {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                            </text>
                            {isUserChoice && <text color="#4A90E2" weight="bold">(Your choice)</text>}
                          </hstack>
                          
                          {!isLie && statement.description && (
                            <text size="small" color="#666" style="italic">
                              Details: {statement.description}
                            </text>
                          )}
                          
                          <text size="small" color="#666">
                            {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                          </text>
                        </vstack>
                      );
                    })}
                  </vstack>

                  <text alignment="center" color="black">
                    💬 How surprising were the truths? Comment below!
                  </text>

                  <button
                    onPress={() => setGameState('leaderboard')}
                    appearance="secondary"
                  >
                    <hstack backgroundColor="#C0C0C0" cornerRadius="large" padding="medium">
                      <text color="black" weight="bold">View Leaderboard 🏆</text>
                    </hstack>
                  </button>
                </vstack>
              </CarnivalCard>
            </vstack>
          </zstack>
        </blocks>
      );
    }

    // Fallback
    return (
      <blocks>
        <vstack alignment="center middle" padding="large">
          <text>Unknown state</text>
        </vstack>
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