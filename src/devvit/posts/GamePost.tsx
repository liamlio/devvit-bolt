import { Devvit, useState, useAsync, Context } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { CreateGameInterface } from '../components/CreateGameInterface.js';
import { GamePlayInterface } from '../components/GamePlayInterface.js';
import { GameResultsInterface } from '../components/GameResultsInterface.js';
import { DescriptionViewInterface } from '../components/DescriptionViewInterface.js';
import { LeaderboardInterface } from '../components/LeaderboardInterface.js';
import { FullLeaderboardInterface } from '../components/FullLeaderboardInterface.js';
import { NextLevelInterface } from '../components/NextLevelInterface.js';
import type { GamePost as GamePostType, UserGuess, Statement, LeaderboardEntry } from '../../shared/types/game.js';

interface GamePostProps {
  context: Context;
}

export const GamePost = ({ context }: GamePostProps): JSX.Element => {
  const { postId, userId, redis, reddit, ui, scheduler } = context;
  const gameService = new GameService(redis);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [gameState, setGameState] = useState<'play' | 'result' | 'description' | 'create' | 'leaderboard' | 'fullLeaderboard' | 'hub' | 'nextLevel'>('play');
  const [viewingDescription, setViewingDescription] = useState<{ statement: Statement; title: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'guessers' | 'liars'>('guessers');
  
  // Store the user's guess locally for immediate UI updates
  const [localUserGuess, setLocalUserGuess] = useState<UserGuess | null>(null);

  // Load game data
  const { data: gameData, loading } = useAsync(async () => {
    try {
      let gamePost = await gameService.getGamePost(postId);
      
      if (!gamePost) {
        return { type: 'new-game' as const };
      }

      let hasGuessed = false;
      let userGuess: UserGuess | undefined;
      let currentUser: any = null;
      let gameSettings;
      
      if (userId && reddit) {
        try {
          currentUser = await reddit.getCurrentUser();
          userGuess = await gameService.getUserGuess(postId, userId);
          hasGuessed = userGuess !== null;
        } catch (err) {
          console.error('Error getting user info:', err);
        }
      }

      // Always load game settings for navigation
      gameSettings = await gameService.getGameSettings();

      return {
        type: 'game' as const,
        gamePost,
        hasGuessed,
        userGuess,
        currentUser,
        gameSettings,
      };
    } catch (err) {
      console.error('Error loading game data:', err);
      throw err;
    }
  }, [refreshTrigger]);

  // Separate leaderboard data loading that always loads when requested
  const { data: leaderboardData, loading: leaderboardLoading } = useAsync(async () => {
    // Only load leaderboard data when we need it
    const needsLeaderboardData = gameState === 'leaderboard' || gameState === 'fullLeaderboard' || gameState === 'hub' || gameState === 'nextLevel';
    if (!needsLeaderboardData) {
      console.log(`Skipping leaderboard data load for gameState: ${gameState}`);
      return null;
    }
    
    try {
      console.log(`Loading leaderboard data for gameState: ${gameState}`);
      
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

      console.log(`Successfully loaded leaderboard data for gameState: ${gameState}`);

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
  }, [gameState, userId]); // Include gameState in dependency array

  const handleSubmitGuess = async () => {
    if (selectedIndex === null || !userId || !reddit || !gameData || gameData.type !== 'game') return;

    try {
      const { gamePost, currentUser } = gameData;
      
      const existingGuess = await gameService.getUserGuess(postId, userId);
      if (existingGuess) {
        ui.showToast('You have already guessed on this post');
        return;
      }

      if (gamePost.authorId === userId) {
        ui.showToast('You cannot guess on your own post');
        return;
      }

      const user = currentUser || await reddit.getCurrentUser();
      if (!user) {
        ui.showToast('Unable to get user information');
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

      // Store the guess locally for immediate UI updates
      setLocalUserGuess(newUserGuess);

      // Update game post data locally for immediate UI updates
      const updatedGamePost = { ...gamePost };
      updatedGamePost.totalGuesses += 1;
      updatedGamePost.guessBreakdown[selectedIndex] += 1;
      if (isCorrect) {
        updatedGamePost.correctGuesses += 1;
      }

      const experiencePoints = isCorrect ? 2 : 1; // CHANGED: Reduced from 4 to 2
      const guesserPoints = isCorrect ? 1 : 0;
      
      // Save to database and update scores - these functions handle all score updates internally
      const [experienceResult, guesserResult] = await Promise.all([
        gameService.saveUserGuess(newUserGuess),
        gameService.updateGamePost(updatedGamePost),
        gameService.awardExperience(userId, user.username, experiencePoints, reddit, scheduler),
        gameService.awardGuesserPoints(userId, user.username, guesserPoints, reddit, scheduler),
      ]);

      // FIXED: Always award liar points for incorrect guesses (unless author is guessing on own post)
      if (!isCorrect && gamePost.authorId !== userId) {
        console.log(`🎭 Awarding liar point to post author u/${gamePost.authorUsername} for incorrect guess by u/${user.username}`);
        await gameService.awardLiarPoints(gamePost.authorId, gamePost.authorUsername, 1, reddit, scheduler);
      }

      // Check if user leveled up from the experience award result
      if (experienceResult && experienceResult.leveledUp) {
        ui.showToast(`Level up! You are now ${experienceResult.newLevel.name}!`);
      }

      // Show immediate feedback
      ui.showToast(isCorrect ? '🎉 Correct! You spotted the lie!' : '😅 Nice try! Better luck next time!');

      // Change UI to post-guess state and trigger data refresh
      setGameState('result');
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('Error submitting guess:', err);
      ui.showToast('Error submitting guess. Please try again.');
    }
  };

  // NEW: Handle author viewing results without guessing
  const handleAuthorViewResults = () => {
    setGameState('result');
  };

  const handleViewDescription = (statement: Statement, title: string) => {
    setViewingDescription({ statement, title });
    setGameState('description');
  };

  const handleBackFromDescription = () => {
    setViewingDescription(null);
    setGameState('result');
  };

  // Navigation handlers for the different buttons
  const handleViewLeaderboard = () => {
    console.log('Switching to leaderboard state');
    setGameState('leaderboard');
  };

  // Show hub interface instead of navigating to URL
  const handleReturnToHub = () => {
    console.log('Switching to hub state');
    setGameState('hub');
  };

  // Show create interface instead of navigating to URL
  const handleCreatePost = () => {
    console.log('Switching to create state');
    setGameState('create');
  };

  const handleBackFromLeaderboard = () => {
    setGameState('result');
  };

  const handleViewFullLeaderboard = () => {
    setGameState('fullLeaderboard');
  };

  const handleBackFromFullLeaderboard = () => {
    setGameState('leaderboard');
  };

  // Back from create and hub should return to results
  const handleBackFromCreate = () => {
    setGameState('result');
  };

  const handleBackFromHub = () => {
    setGameState('result');
  };

  // NEW: Handle next level navigation
  const handleViewNextLevel = () => {
    console.log('Switching to nextLevel state');
    setGameState('nextLevel');
  };

  const handleBackFromNextLevel = () => {
    setGameState('leaderboard');
  };

  // Handle loading state
  if (loading) {
    return <LoadingState />;
  }

  // Handle error state
  if (!gameData) {
    return (
      <ErrorState 
        error={error || 'Something went wrong. Please try again.'} 
        onRetry={() => {
          setError('');
          setRefreshTrigger(prev => prev + 1);
        }} 
      />
    );
  }

  // New game post that needs to be configured
  if (gameData.type === 'new-game') {
    return (
      <CreateGameInterface
        context={context}
        onBack={() => ui.showToast('This post needs to be configured first')}
        onShowToast={(message) => ui.showToast(message)}
      />
    );
  }

  // Game post
  if (gameData.type === 'game') {
    const { gamePost, hasGuessed, userGuess, currentUser, gameSettings } = gameData;

    // Use local user guess if available (for immediate UI updates), otherwise use database guess
    const effectiveUserGuess = localUserGuess || userGuess;
    const effectiveHasGuessed = hasGuessed || localUserGuess !== null;

    // Check if current user is the post author
    const isAuthor = userId === gamePost.authorId;

    // NEW: Next Level interface
    if (gameState === 'nextLevel') {
      // Check if we're currently loading leaderboard data
      if (leaderboardLoading) {
        console.log('NextLevel state: loading leaderboard data');
        return <LoadingState />;
      }

      // Check if leaderboard data failed to load or user stats not available
      if (!leaderboardData || !leaderboardData.userStats) {
        console.log('NextLevel state: no user stats available');
        return (
          <ErrorState 
            error="Failed to load user stats" 
            onRetry={() => {
              console.log('Retrying user stats load');
              setRefreshTrigger(prev => prev + 1);
            }} 
          />
        );
      }

      console.log('NextLevel state: showing NextLevelInterface with data');
      return (
        <NextLevelInterface
          context={context}
          userStats={leaderboardData.userStats}
          onBack={handleBackFromNextLevel}
        />
      );
    }

    // Hub interface (community hub shown within the game post)
    if (gameState === 'hub') {
      // Check if we're currently loading leaderboard data
      if (leaderboardLoading) {
        console.log('Hub state: loading leaderboard data');
        return <LoadingState />;
      }

      // Check if leaderboard data failed to load
      if (!leaderboardData) {
        console.log('Hub state: no leaderboard data available');
        return (
          <ErrorState 
            error="Failed to load leaderboard data" 
            onRetry={() => {
              console.log('Retrying leaderboard data load');
              setRefreshTrigger(prev => prev + 1);
            }} 
          />
        );
      }

      console.log('Hub state: showing LeaderboardInterface with data');
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
          onCreateGame={handleCreatePost}
          onViewFullLeaderboard={handleViewFullLeaderboard}
          onViewNextLevel={handleViewNextLevel}
          // Add back button functionality
          onBack={handleBackFromHub}
          showBackButton={true}
        />
      );
    }

    // Create game interface
    if (gameState === 'create') {
      return (
        <CreateGameInterface
          context={context}
          onBack={handleBackFromCreate}
          onShowToast={(message) => ui.showToast(message)}
        />
      );
    }

    // Leaderboard interface
    if (gameState === 'leaderboard') {
      // Check if we're currently loading leaderboard data
      if (leaderboardLoading) {
        console.log('Leaderboard state: loading leaderboard data');
        return <LoadingState />;
      }

      // Check if leaderboard data failed to load
      if (!leaderboardData) {
        console.log('Leaderboard state: no leaderboard data available');
        return (
          <ErrorState 
            error="Failed to load leaderboard data" 
            onRetry={() => {
              console.log('Retrying leaderboard data load');
              setRefreshTrigger(prev => prev + 1);
            }} 
          />
        );
      }

      console.log('Leaderboard state: showing LeaderboardInterface with data');
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
          onCreateGame={handleCreatePost}
          onViewFullLeaderboard={handleViewFullLeaderboard}
          onViewNextLevel={handleViewNextLevel}
          // Add back button functionality
          onBack={handleBackFromLeaderboard}
          showBackButton={true}
        />
      );
    }

    // Full leaderboard interface
    if (gameState === 'fullLeaderboard') {
      if (leaderboardLoading) {
        return <LoadingState />;
      }

      if (!leaderboardData) {
        return (
          <ErrorState 
            error="Failed to load leaderboard data" 
            onRetry={() => {
              setRefreshTrigger(prev => prev + 1);
            }} 
          />
        );
      }

      return (
        <FullLeaderboardInterface
          context={context}
          weeklyGuesserLeaderboard={leaderboardData.weeklyGuesserLeaderboard}
          allTimeGuesserLeaderboard={leaderboardData.allTimeGuesserLeaderboard}
          weeklyLiarLeaderboard={leaderboardData.weeklyLiarLeaderboard}
          allTimeLiarLeaderboard={leaderboardData.allTimeLiarLeaderboard}
          activeTab={activeLeaderboardTab}
          onTabChange={setActiveLeaderboardTab}
          onBack={handleBackFromFullLeaderboard}
        />
      );
    }

    // Description view
    if (gameState === 'description' && viewingDescription) {
      return (
        <DescriptionViewInterface
          context={context}
          statement={viewingDescription.statement}
          title={viewingDescription.title}
          onBack={handleBackFromDescription}
        />
      );
    }

    // Show results immediately after guessing, if already guessed, OR if author views results
    if (effectiveHasGuessed || gameState === 'result') {
      return (
        <GameResultsInterface
          context={context}
          gamePost={gamePost}
          userGuess={effectiveUserGuess}
          gameSettings={gameSettings}
          onViewDescription={handleViewDescription}
          onViewLeaderboard={handleViewLeaderboard}
          onReturnToHub={handleReturnToHub}
          onCreatePost={handleCreatePost}
        />
      );
    }

    // Game play interface - Pass the new onViewResults callback
    return (
      <GamePlayInterface
        context={context}
        gamePost={gamePost}
        selectedIndex={selectedIndex}
        onSelectStatement={setSelectedIndex}
        onSubmitGuess={handleSubmitGuess}
        onViewResults={handleAuthorViewResults} // NEW: Pass the callback for authors
      />
    );
  }

  // Fallback
  return <ErrorState error="Unknown game state" onRetry={() => setRefreshTrigger(prev => prev + 1)} />;
};