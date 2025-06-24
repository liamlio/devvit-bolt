import { Devvit, useState, useAsync } from '@devvit/public-api';
import { GameService } from '../server/core/game';
import type { GamePost, UserGuess, UserScore, LeaderboardEntry } from '../shared/types/game';
import { getLevelByExperience, LEVELS } from '../server/core/levels';

// Configure Devvit
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
});

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

    // Handle loading state
    if (loading) {
      return (
        <blocks>
          <zstack width="100%" height="100%" alignment="center middle">
            <vstack width="100%" height="100%" backgroundColor="#3b82f6" />
            <vstack alignment="center middle" gap="medium">
              <text size="xxlarge">🎪</text>
              <text size="large" weight="bold" color="white">Loading Two Truths One Lie...</text>
            </vstack>
          </zstack>
        </blocks>
      );
    }

    // Handle error state
    if (!initialData) {
      return (
        <blocks>
          <zstack width="100%" height="100%" alignment="center middle">
            <vstack width="100%" height="100%" backgroundColor="#ef4444" />
            <vstack alignment="center middle" gap="medium" padding="large">
              <text size="xxlarge">⚠️</text>
              <text size="large" weight="bold" color="white">Error Loading Game</text>
              <text color="white" alignment="center">
                {error || 'Something went wrong. Please try again.'}
              </text>
              <button
                onPress={() => {
                  setError('');
                  setGameState('loading');
                }}
                appearance="primary"
              >
                Retry
              </button>
            </vstack>
          </zstack>
        </blocks>
      );
    }

    // New game post that needs to be configured
    if (initialData.type === 'new-game') {
      return (
        <blocks>
          <vstack padding="large" gap="medium">
            <text size="xxlarge" alignment="center">🎪 Configure Your Game</text>
            <text alignment="center" color="neutral-content-weak">
              This post needs to be configured with your Two Truths One Lie game!
            </text>
            
            <vstack gap="medium" padding="medium" backgroundColor="neutral-background-weak" cornerRadius="medium">
              <text weight="bold">To set up your game:</text>
              <text size="small">1. Use the menu action "[TTOL] Configure Game Post" from the three dots menu</text>
              <text size="small">2. Or create a new game from the community hub</text>
            </vstack>

            <button
              onPress={() => {
                context.ui.showToast('Use the menu action to configure this post');
              }}
              appearance="primary"
              size="large"
            >
              Configure Game 🎪
            </button>
          </vstack>
        </blocks>
      );
    }

    // Pinned post (community hub)
    if (initialData.type === 'pinned') {
      const { leaderboard } = initialData;
      
      if (gameState === 'create') {
        return (
          <blocks>
            <vstack padding="large" gap="medium">
              <text size="xxlarge" alignment="center">🎪 Create Your Game</text>
              <text alignment="center" color="neutral-content-weak">
                Create your game with two truths and one lie! Players will try to guess which statement is false.
              </text>
              
              <vstack gap="small">
                <text weight="bold">Truth #1 ✅</text>
                <textInput placeholder="Enter your first true statement..." />
                <textInput placeholder="Optional: Add details to make it believable..." />
              </vstack>
              
              <vstack gap="small">
                <text weight="bold">Truth #2 ✅</text>
                <textInput placeholder="Enter your second true statement..." />
                <textInput placeholder="Optional: Add details to make it believable..." />
              </vstack>
              
              <vstack gap="small">
                <text weight="bold">The Lie ❌</text>
                <textInput placeholder="Enter your convincing lie..." />
              </vstack>

              <hstack gap="medium">
                <button
                  onPress={() => setGameState('leaderboard')}
                  appearance="secondary"
                  grow
                >
                  Back
                </button>
                <button
                  onPress={async () => {
                    // This would need to be implemented to create a new post
                    // For now, show a message
                    context.ui.showToast('Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.');
                  }}
                  appearance="primary"
                  grow
                >
                  Create Game Post!
                </button>
              </hstack>
            </vstack>
          </blocks>
        );
      }

      // Leaderboard view (default for pinned post)
      const currentLeaderboard = activeTab === 'guessers' 
        ? leaderboard.guesserLeaderboard 
        : leaderboard.liarLeaderboard;

      return (
        <blocks>
          <vstack padding="large" gap="medium">
            <text size="xxlarge" alignment="center">🏆 Two Truths One Lie</text>
            <text alignment="center" color="neutral-content-weak">
              Welcome to the carnival of deception! Can you spot the lies?
            </text>

            {/* User Stats */}
            {leaderboard.userStats && (
              <vstack padding="medium" backgroundColor="neutral-background-weak" cornerRadius="medium">
                <text weight="bold">Your Stats</text>
                <hstack gap="large">
                  <vstack>
                    <text size="small" color="neutral-content-weak">Level {leaderboard.userStats.level}</text>
                    <text size="small" color="neutral-content-weak">{leaderboard.userStats.experience} XP</text>
                  </vstack>
                  <vstack>
                    <text size="small" color="neutral-content-weak">Games: {leaderboard.userStats.totalGames}</text>
                    <text size="small" color="neutral-content-weak">
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
                🕵️ Best Guessers
              </button>
              <button
                onPress={() => setActiveTab('liars')}
                appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
                grow
              >
                🎭 Best Liars
              </button>
            </hstack>

            {/* Leaderboard */}
            <vstack gap="small">
              {currentLeaderboard.length > 0 ? (
                currentLeaderboard.map((entry, index) => (
                  <hstack key={entry.userId} padding="small" backgroundColor="neutral-background-weak" cornerRadius="small">
                    <text weight="bold" width="40px">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </text>
                    <text grow>u/{entry.username}</text>
                    <text weight="bold">{entry.score}</text>
                  </hstack>
                ))
              ) : (
                <vstack alignment="center middle" padding="large">
                  <text size="large">🎪</text>
                  <text color="neutral-content-weak">No entries yet! Be the first to play!</text>
                </vstack>
              )}
            </vstack>

            {/* Action Button */}
            <button
              onPress={() => setGameState('create')}
              appearance="primary"
              size="large"
            >
              Create Your Game 🎪
            </button>
          </vstack>
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
            <vstack padding="large" gap="medium">
              <text size="xxlarge" alignment="center">🎪 Two Truths One Lie</text>
              <text alignment="center" color="neutral-content-weak">
                Can you spot the lie? Choose the statement you think is false!
              </text>
              <text size="small" alignment="center" color="neutral-content-weak">
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
                    <text alignment="start">{statement.text}</text>
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
                Submit Guess! 🎯
              </button>
            </vstack>
          </blocks>
        );
      }

      // Results interface
      return (
        <blocks>
          <vstack padding="large" gap="medium">
            <text size="xxlarge" alignment="center">🎪 Results</text>
            <text alignment="center" color="neutral-content-weak">
              {userGuess?.isCorrect 
                ? '🎉 Congratulations! You spotted the lie!' 
                : '😅 Nice try! Better luck next time!'
              }
            </text>
            <text size="small" alignment="center" color="neutral-content-weak">
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
                  <vstack key={index} padding="medium" backgroundColor={isLie ? "red-weak" : "green-weak"} cornerRadius="medium">
                    <hstack>
                      <text grow weight="bold">
                        {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                      </text>
                      {isUserChoice && <text color="blue">(Your choice)</text>}
                    </hstack>
                    
                    {!isLie && statement.description && (
                      <text size="small" color="neutral-content-weak" style="italic">
                        Details: {statement.description}
                      </text>
                    )}
                    
                    <text size="small" color="neutral-content-weak">
                      {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                    </text>
                  </vstack>
                );
              })}
            </vstack>

            <text alignment="center" color="neutral-content-weak">
              💬 How surprising were the truths? Comment below!
            </text>

            <button
              onPress={() => setGameState('leaderboard')}
              appearance="secondary"
            >
              View Leaderboard 🏆
            </button>
          </vstack>
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

// Menu item for creating new posts
Devvit.addMenuItem({
  label: '[TTOL] New Two Truths One Lie Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    
    try {
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
              <text color="neutral-content-weak">Loading game...</text>
            </vstack>
          </blocks>
        ),
      });
      
      ui.showToast({ text: 'Created Two Truths One Lie post! Configure it using the menu.' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error creating post:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error creating post!',
      });
    }
  },
});

// Menu item for configuring a game post
Devvit.addMenuItem({
  label: '[TTOL] Configure Game Post',
  location: 'post',
  forUserType: 'moderator',
  postFilter: 'currentApp',
  onPress: async (event, context) => {
    const { ui, redis, reddit } = context;
    const postId = event.targetId;
    
    try {
      const gameService = new GameService(redis);
      
      // Check if this post already has a game configured
      const existingGame = await gameService.getGamePost(postId);
      if (existingGame) {
        ui.showToast({ text: 'This post already has a game configured!' });
        return;
      }
      
      // Set this as a game post
      await gameService.setPostType(postId, 'game');
      
      ui.showToast({ text: 'Post configured! Now create your game using the web interface.' });
    } catch (error) {
      console.error('Error configuring post:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error configuring post!',
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