import { Devvit, useState, useAsync, Context } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { CreateGameInterface } from '../components/CreateGameInterface.js';
import { GamePlayInterface } from '../components/GamePlayInterface.js';
import { GameResultsInterface } from '../components/GameResultsInterface.js';
import { DescriptionViewInterface } from '../components/DescriptionViewInterface.js';
import type { GamePost as GamePostType, UserGuess, Statement } from '../../shared/types/game.js';

interface GamePostProps {
  context: Context;
}

export const GamePost = ({ context }: GamePostProps): JSX.Element => {
  const { postId, userId, redis, reddit, ui } = context;
  const gameService = new GameService(redis);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [gameState, setGameState] = useState<'play' | 'result' | 'description' | 'create'>('play');
  const [viewingDescription, setViewingDescription] = useState<{ statement: Statement; title: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger

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
      
      if (userId && reddit) {
        try {
          currentUser = await reddit.getCurrentUser();
          userGuess = await gameService.getUserGuess(postId, userId);
          hasGuessed = userGuess !== null;
        } catch (err) {
          console.error('Error getting user info:', err);
        }
      }

      return {
        type: 'game' as const,
        gamePost,
        hasGuessed,
        userGuess,
        currentUser,
      };
    } catch (err) {
      console.error('Error loading game data:', err);
      throw err;
    }
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  const handleSubmitGuess = async () => {
    if (selectedIndex === null || !userId || !reddit || !gameData || gameData.type !== 'game') return;

    try {
      const { gamePost, currentUser } = gameData;
      
      const existingGuess = await gameService.getUserGuess(postId, userId);
      if (existingGuess) {
        ui.showToast('You have already guessed on this post');
        return;
      }

      // TESTING EXCEPTION: Allow u/liamlio to guess on their own posts
      // This is for testing purposes only and should be removed in production
      const isTestUser = currentUser?.username === 'liamlio';
      if (gamePost.authorId === userId && !isTestUser) {
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

      // Don't award liar points if the author is guessing on their own post (testing exception)
      if (!isCorrect && gamePost.authorId !== userId) {
        await gameService.awardLiarPoints(gamePost.authorId, gamePost.authorUsername, 1);
      }

      const userScore = await gameService.getUserScore(userId);
      const newLevel = gameService.getLevelByExperience(userScore.experience);
      
      if (newLevel.level > userScore.level) {
        userScore.level = newLevel.level;
        await gameService.updateUserScore(userScore);
        ui.showToast(`Level up! You are now ${newLevel.name}!`);
      }

      // Show immediate feedback
      ui.showToast(isCorrect ? '🎉 Correct! You spotted the lie!' : '😅 Nice try! Better luck next time!');

      // Change UI to post-guess state and trigger data refresh
      setGameState('result');
      setRefreshTrigger(prev => prev + 1); // Trigger useAsync to re-run
      
    } catch (err) {
      console.error('Error submitting guess:', err);
      ui.showToast('Error submitting guess. Please try again.');
    }
  };

  const handleBackToGuessing = async () => {
    if (!userId || !gameData || gameData.type !== 'game') return;

    try {
      // TESTING EXCEPTION: Allow u/liamlio to reset their guess and guess again
      // This is for testing purposes only and should be removed in production
      const { currentUser } = gameData;
      const isTestUser = currentUser?.username === 'liamlio';
      
      if (!isTestUser) {
        ui.showToast('This feature is only available for testing');
        return;
      }

      // Remove the user's guess to allow them to guess again
      await gameService.removeUserGuess(postId, userId);
      
      // Reset selected index and game state
      setSelectedIndex(null);
      setGameState('play');
      
      ui.showToast('🔄 Reset complete! You can guess again.');
      
      // Trigger data refresh
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('Error resetting guess:', err);
      ui.showToast('Error resetting guess. Please try again.');
    }
  };

  const handleViewDescription = (statement: Statement, title: string) => {
    setViewingDescription({ statement, title });
    setGameState('description');
  };

  const handleBackFromDescription = () => {
    setViewingDescription(null);
    setGameState('result');
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
          setRefreshTrigger(prev => prev + 1); // Use refresh trigger instead of error manipulation
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
    const { gamePost, hasGuessed, userGuess, currentUser } = gameData;

    // TESTING EXCEPTION: Check if this is the test user
    const isTestUser = currentUser?.username === 'liamlio';

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

    // Show results immediately after guessing, or if already guessed
    if (hasGuessed || gameState === 'result') {
      return (
        <GameResultsInterface
          context={context}
          gamePost={gamePost}
          userGuess={userGuess}
          onViewLeaderboard={() => {
            // This would need to be handled by the parent component
            ui.showToast('Leaderboard feature coming soon!');
          }}
          onViewDescription={handleViewDescription}
          // TESTING EXCEPTION: Show back button only for u/liamlio
          showBackButton={isTestUser}
          onBackToGuessing={handleBackToGuessing}
        />
      );
    }

    // Game play interface
    return (
      <GamePlayInterface
        context={context}
        gamePost={gamePost}
        selectedIndex={selectedIndex}
        onSelectStatement={setSelectedIndex}
        onSubmitGuess={handleSubmitGuess}
      />
    );
  }

  // Fallback
  return <ErrorState error="Unknown game state" onRetry={() => setRefreshTrigger(prev => prev + 1)} />;
};