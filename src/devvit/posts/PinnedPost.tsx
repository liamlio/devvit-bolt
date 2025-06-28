import { Devvit, useState, useAsync, useForm } from '@devvit/public-api';
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

  // Character limits
  const CHARACTER_LIMITS = {
    statement: 200,
    description: 500,
  };

  // Improvement 3: Create a new post when clicking "Create Game"
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
      
      // Improvement 3: Create a new post by the user, not the app
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

  // Create game form definition with character limits
  const createGameForm = useForm(
    {
      title: '🎪 Create Your Two Truths One Lie Game',
      description: 'Create two true statements and one lie. Players will try to guess which statement is false!',
      acceptLabel: 'Create Game! 🎪',
      cancelLabel: 'Cancel',
      fields: [
        {
          type: 'paragraph',
          name: 'truth1',
          label: `Truth #1 ✅ (max ${CHARACTER_LIMITS.statement} chars)`,
          helpText: 'Enter your first true statement',
          required: true,
        },
        {
          type: 'paragraph',
          name: 'truth1Description',
          label: `Truth #1 Details (Optional, max ${CHARACTER_LIMITS.description} chars)`,
          helpText: 'Add details to make it more believable',
          required: false,
        },
        {
          type: 'paragraph',
          name: 'truth2',
          label: `Truth #2 ✅ (max ${CHARACTER_LIMITS.statement} chars)`,
          helpText: 'Enter your second true statement',
          required: true,
        },
        {
          type: 'paragraph',
          name: 'truth2Description',
          label: `Truth #2 Details (Optional, max ${CHARACTER_LIMITS.description} chars)`,
          helpText: 'Add details to make it more believable',
          required: false,
        },
        {
          type: 'paragraph',
          name: 'lie',
          label: `The Lie ❌ (max ${CHARACTER_LIMITS.statement} chars)`,
          helpText: 'Enter your convincing lie',
          required: true,
        },
      ],
    },
    async (values) => {
      try {
        // Validate character limits
        if (values.truth1!.length > CHARACTER_LIMITS.statement) {
          ui.showToast(`Truth #1 exceeds ${CHARACTER_LIMITS.statement} character limit`);
          return;
        }
        if (values.truth2!.length > CHARACTER_LIMITS.statement) {
          ui.showToast(`Truth #2 exceeds ${CHARACTER_LIMITS.statement} character limit`);
          return;
        }
        if (values.lie!.length > CHARACTER_LIMITS.statement) {
          ui.showToast(`The lie exceeds ${CHARACTER_LIMITS.statement} character limit`);
          return;
        }
        if (values.truth1Description && values.truth1Description.length > CHARACTER_LIMITS.description) {
          ui.showToast(`Truth #1 description exceeds ${CHARACTER_LIMITS.description} character limit`);
          return;
        }
        if (values.truth2Description && values.truth2Description.length > CHARACTER_LIMITS.description) {
          ui.showToast(`Truth #2 description exceeds ${CHARACTER_LIMITS.description} character limit`);
          return;
        }

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

        await handleCreateGamePost(truth1, truth2, lie);
      } catch (error) {
        console.error('Error creating game:', error);
        ui.showToast('Error creating game. Please try again.');
      }
    }
  );

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
        onShowCreateGameForm={() => ui.showForm(createGameForm)}
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