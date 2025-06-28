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

  // This will be handled by the CreateGameInterface component now
  const handleCreateGamePost = async (truth1: Statement, truth2: Statement, lie: Statement) => {
    // This is now handled in CreateGameInterface component
    console.log('handleCreateGamePost called with:', { truth1, truth2, lie });
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
        redis={redis}
        reddit={reddit}
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