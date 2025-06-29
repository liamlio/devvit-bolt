import { Devvit, useState, useAsync, Context } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { LeaderboardInterface } from '../components/LeaderboardInterface.js';
import { CreateGameInterface } from '../components/CreateGameInterface.js';
import type { GamePost as GamePostType, Statement } from '../../shared/types/game.js';

interface PinnedPostProps {
  context: Context;
}

export const PinnedPost = ({ context }: PinnedPostProps): JSX.Element => {
  const { postId, userId, redis, reddit, ui } = context;
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
        gameService.getLeaderboard('guesser', 'weekly', 10),
        gameService.getLeaderboard('liar', 'weekly', 10),
      ]);

      let userStats;
      let userWeeklyGuesserRank;
      let userWeeklyLiarRank;
      let userAllTimeGuesserRank;
      let userAllTimeLiarRank;
      
      if (userId) {
        userStats = await gameService.getUserScore(userId);
        
        // Get user's leaderboard positions
        [userWeeklyGuesserRank, userWeeklyLiarRank, userAllTimeGuesserRank, userAllTimeLiarRank] = await Promise.all([
          gameService.getUserLeaderboardRank(userId, 'guesser', 'weekly'),
          gameService.getUserLeaderboardRank(userId, 'liar', 'weekly'),
          gameService.getUserLeaderboardRank(userId, 'guesser', 'alltime'),
          gameService.getUserLeaderboardRank(userId, 'liar', 'alltime'),
        ]);
      }

      return {
        guesserLeaderboard,
        liarLeaderboard,
        userStats,
        userWeeklyGuesserRank,
        userWeeklyLiarRank,
        userAllTimeGuesserRank,
        userAllTimeLiarRank,
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
        context={context}
        onBack={() => setGameState('leaderboard')}
        onShowToast={(message) => ui.showToast(message)}
        onCreateGame={handleCreateGamePost}
      />
    );
  }

  // Leaderboard view (default for pinned post)
  return (
    <LeaderboardInterface
      context={context}
      guesserLeaderboard={leaderboardData.guesserLeaderboard}
      liarLeaderboard={leaderboardData.liarLeaderboard}
      userStats={leaderboardData.userStats}
      userWeeklyGuesserRank={leaderboardData.userWeeklyGuesserRank}
      userWeeklyLiarRank={leaderboardData.userWeeklyLiarRank}
      userAllTimeGuesserRank={leaderboardData.userAllTimeGuesserRank}
      userAllTimeLiarRank={leaderboardData.userAllTimeLiarRank}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onCreateGame={() => setGameState('create')}
    />
  );
};