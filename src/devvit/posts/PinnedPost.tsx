import { Devvit, useState, useAsync } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { LeaderboardInterface } from '../components/LeaderboardInterface.js';
import { CreateGameInterface } from '../components/CreateGameInterface.js';
import type { GamePost as GamePostType, Statement } from '../../shared/types/game.js';

interface PinnedPostProps {
  postId: string;
  userId?: string;
  redis: any;
  reddit?: any;
  ui: any;
}

export const PinnedPost = ({ postId, userId, redis, reddit, ui }: PinnedPostProps): JSX.Element => {
  const gameService = new GameService(redis);
  const [gameState, setGameState] = useState<'leaderboard' | 'create'>('leaderboard');
  const [activeTab, setActiveTab] = useState<'guessers' | 'liars'>('guessers');

  // Create a new post when clicking "Create Game"
  const handleCreateGamePost = async (truth1: Statement, truth2: Statement, lie: Statement) => {
    if (!userId || !reddit) {
      ui.showToast('Must be logged in to create a game');
      return;
    }

    try {
      const user = await reddit.getCurrentUser();
      if (!user) {
        ui.showToast('Unable to get user information');
        return;
      }

      const userScore = await gameService.getUserScore(userId);
      if (userScore.level < 1 && userScore.experience < 1) {
        ui.showToast('You must reach level 1 by playing at least one game before creating your own post');
        return;
      }

      const subreddit = await reddit.getCurrentSubreddit();
      
      // Create a new post by the user, not the app
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Can You Spot the Lie? 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🎪</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Ready to play...</text>
            </vstack>
          </blocks>
        ),
        runAs: 'USER', // Post as the user, not the app
        userGeneratedContent: {
          text: `Two Truths One Lie game: "${truth1.text}", "${truth2.text}", "${lie.text}"`
        },
      });

      const lieIndex = Math.floor(Math.random() * 3);
      
      const gamePost: GamePostType = {
        postId: post.id,
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
      await gameService.setPostType(post.id, 'game');

      ui.showToast('Game post created successfully! 🎪');
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error creating game post:', error);
      ui.showToast('Error creating game post. Please try again.');
    }
  };

  // Load leaderboard data
  const { data: leaderboardData, loading } = useAsync(async () => {
    try {
      const [guesserLeaderboard, liarLeaderboard] = await Promise.all([
        gameService.getLeaderboard('guesser', 'alltime', 10),
        gameService.getLeaderboard('liar', 'alltime', 10),
      ]);

      let userStats;
      if (userId) {
        userStats = await gameService.getUserScore(userId);
      }

      return {
        guesserLeaderboard,
        liarLeaderboard,
        userStats,
      };
    } catch (err) {
      console.error('Error loading leaderboard data:', err);
      throw err;
    }
  });

  // Handle loading state
  if (loading) {
    return <LoadingState />;
  }

  // Handle error state
  if (!leaderboardData) {
    return (
      <ErrorState 
        error="Failed to load leaderboard data" 
        onRetry={() => {
          // Trigger reload
          window.location.reload();
        }} 
      />
    );
  }

  if (gameState === 'create') {
    return (
      <CreateGameInterface
        onBack={() => setGameState('leaderboard')}
        onShowToast={(message) => ui.showToast(message)}
        onCreateGame={handleCreateGamePost}
        ui={ui}
        postId={postId}
        userId={userId}
        authorUsername={leaderboardData.userStats?.username}
      />
    );
  }

  // Leaderboard view (default for pinned post)
  return (
    <LeaderboardInterface
      guesserLeaderboard={leaderboardData.guesserLeaderboard}
      liarLeaderboard={leaderboardData.liarLeaderboard}
      userStats={leaderboardData.userStats}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onCreateGame={() => setGameState('create')}
    />
  );
};