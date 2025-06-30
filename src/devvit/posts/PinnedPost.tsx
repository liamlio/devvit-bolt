import { Devvit, useState, useAsync, Context } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { LeaderboardInterface } from '../components/LeaderboardInterface.js';
import { FullLeaderboardInterface } from '../components/FullLeaderboardInterface.js';
import { CreateGameInterface } from '../components/CreateGameInterface.js';
import { NextLevelInterface } from '../components/NextLevelInterface.js';
import type { GamePost as GamePostType, Statement } from '../../shared/types/game.js';

interface PinnedPostProps {
  context: Context;
}

export const PinnedPost = ({ context }: PinnedPostProps): JSX.Element => {
  const { postId, userId, redis, reddit, ui } = context;
  const gameService = new GameService(redis);
  const [gameState, setGameState] = useState<'leaderboard' | 'fullLeaderboard' | 'create' | 'nextLevel'>('leaderboard');
  const [activeTab, setActiveTab] = useState<'guessers' | 'liars'>('guessers');

  // This will be handled by the CreateGameInterface component now
  const handleCreateGamePost = async (truth1: Statement, truth2: Statement, lie: Statement) => {
    // This is now handled in CreateGameInterface component
    console.log('handleCreateGamePost called with:', { truth1, truth2, lie });
  };

  // Load leaderboard data
  const { data: leaderboardData, loading } = useAsync(async () => {
    try {
      const [
        weeklyGuesserLeaderboard, 
        weeklyLiarLeaderboard,
        allTimeGuesserLeaderboard,
        allTimeLiarLeaderboard
      ] = await Promise.all([
        gameService.getLeaderboard('guesser', 'weekly', 20),
        gameService.getLeaderboard('liar', 'weekly', 20),
        gameService.getLeaderboard('guesser', 'alltime', 20),
        gameService.getLeaderboard('liar', 'alltime', 20),
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
        weeklyGuesserLeaderboard,
        weeklyLiarLeaderboard,
        allTimeGuesserLeaderboard,
        allTimeLiarLeaderboard,
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

  // NEW: Next Level interface
  if (gameState === 'nextLevel') {
    if (!leaderboardData.userStats) {
      return (
        <ErrorState 
          error="User stats not available" 
          onRetry={() => {
            window.location.reload();
          }} 
        />
      );
    }

    return (
      <NextLevelInterface
        context={context}
        userStats={leaderboardData.userStats}
        onBack={() => setGameState('leaderboard')}
      />
    );
  }

  if (gameState === 'fullLeaderboard') {
    return (
      <FullLeaderboardInterface
        context={context}
        weeklyGuesserLeaderboard={leaderboardData.weeklyGuesserLeaderboard}
        allTimeGuesserLeaderboard={leaderboardData.allTimeGuesserLeaderboard}
        weeklyLiarLeaderboard={leaderboardData.weeklyLiarLeaderboard}
        allTimeLiarLeaderboard={leaderboardData.allTimeLiarLeaderboard}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => setGameState('leaderboard')}
      />
    );
  }

  // Leaderboard preview (default for pinned post)
  return (
    <LeaderboardInterface
      context={context}
      guesserLeaderboard={leaderboardData.weeklyGuesserLeaderboard}
      liarLeaderboard={leaderboardData.weeklyLiarLeaderboard}
      userStats={leaderboardData.userStats}
      userWeeklyGuesserRank={leaderboardData.userWeeklyGuesserRank}
      userWeeklyLiarRank={leaderboardData.userWeeklyLiarRank}
      userAllTimeGuesserRank={leaderboardData.userAllTimeGuesserRank}
      userAllTimeLiarRank={leaderboardData.userAllTimeLiarRank}
      onCreateGame={() => setGameState('create')}
      onViewFullLeaderboard={() => setGameState('fullLeaderboard')}
      onViewNextLevel={() => setGameState('nextLevel')}
    />
  );
};