import React, { useState, useEffect } from 'react';
import { CarnivalBackground } from './components/CarnivalBackground';
import { CarnivalButton } from './components/CarnivalButton';
import { GameCreator } from './components/GameCreator';
import { GamePlayer } from './components/GamePlayer';
import { Leaderboard } from './components/Leaderboard';
import type { 
  GameState, 
  GamePost, 
  UserGuess, 
  CreateGameRequest,
  ApiResponse,
  GuessResponse,
  LeaderboardResponse
} from '../shared/types/game';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('loading');
  const [gamePost, setGamePost] = useState<GamePost | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [userGuess, setUserGuess] = useState<UserGuess | undefined>();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  // Check connection and load initial data
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // First check if this is a game post or pinned post
      const postTypeResponse = await fetch('/api/post-type');
      if (!postTypeResponse.ok) {
        throw new Error('Failed to connect to backend');
      }

      const postTypeResult: ApiResponse<{ postType: 'game' | 'pinned' | null }> = await postTypeResponse.json();
      
      if (postTypeResult.status === 'error') {
        throw new Error(postTypeResult.message);
      }

      setIsConnected(true);

      if (postTypeResult.data.postType === 'pinned') {
        // This is the pinned community post - show main menu
        await loadLeaderboard();
        setGameState('leaderboard');
      } else if (postTypeResult.data.postType === 'game') {
        // This is a game post - load game data
        await loadGamePost();
      } else {
        // Unknown post type
        setError('This post is not configured for Two Truths One Lie');
        setGameState('error');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
      setGameState('error');
    }
  };

  const loadGamePost = async () => {
    try {
      const response = await fetch('/api/post');
      if (!response.ok) {
        throw new Error('Failed to load game data');
      }

      const result: ApiResponse<{ gamePost: GamePost; hasGuessed: boolean; userGuess?: UserGuess }> = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message);
      }

      setGamePost(result.data.gamePost);
      setHasGuessed(result.data.hasGuessed);
      setUserGuess(result.data.userGuess);
      setGameState('play');
    } catch (err) {
      console.error('Error loading game post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setGameState('error');
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const result: ApiResponse<LeaderboardResponse> = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message);
      }

      setLeaderboardData(result.data);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    }
  };

  const handleCreateGame = async (gameData: CreateGameRequest) => {
    try {
      const response = await fetch('/api/create-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });

      if (!response.ok) {
        throw new Error('Failed to create game post');
      }

      const result: ApiResponse<{ postId: string }> = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Redirect to the new post (this will be handled by the backend)
      window.location.href = `/r/YOUR_SUBREDDIT/comments/${result.data.postId}`;
    } catch (err) {
      console.error('Error creating game:', err);
      throw err; // Re-throw to be handled by GameCreator
    }
  };

  const handleGuess = async (guessIndex: number) => {
    if (!gamePost) return;

    try {
      const response = await fetch('/api/guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: gamePost.postId,
          guessIndex,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit guess');
      }

      const result: ApiResponse<GuessResponse> = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Update game state with the result
      setGamePost(result.data.gamePost);
      setHasGuessed(true);
      setUserGuess({
        userId: '', // Will be filled by backend
        username: '', // Will be filled by backend
        postId: gamePost.postId,
        guessIndex,
        isCorrect: result.data.isCorrect,
        timestamp: Date.now(),
      });

      // Show level up message if applicable
      if (result.data.leveledUp) {
        // You could show a toast or modal here
        console.log(`Level up! You are now level ${result.data.newLevel}`);
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
      throw err;
    }
  };

  // Loading state
  if (gameState === 'loading') {
    return (
      <CarnivalBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🎪</div>
            <div className="text-2xl font-bold text-white">Loading Two Truths One Lie...</div>
          </div>
        </div>
      </CarnivalBackground>
    );
  }

  // Error state
  if (gameState === 'error') {
    return (
      <CarnivalBackground>
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border-4 border-red-300 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">Connection Error</h2>
            <p className="text-red-600 mb-6">{error}</p>
            
            {!isConnected && (
              <div className="text-left bg-red-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-red-800 mb-2">Troubleshooting:</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Make sure you're viewing this on Reddit, not in a preview</li>
                  <li>• Check that the development server is running</li>
                  <li>• Try refreshing the page</li>
                </ul>
              </div>
            )}
            
            <CarnivalButton
              variant="danger"
              onClick={checkConnection}
            >
              Retry Connection
            </CarnivalButton>
          </div>
        </div>
      </CarnivalBackground>
    );
  }

  // Main game states
  return (
    <CarnivalBackground>
      <div className="min-h-screen py-8">
        {gameState === 'create' && (
          <GameCreator
            onCreateGame={handleCreateGame}
            onBack={() => setGameState('leaderboard')}
          />
        )}

        {gameState === 'play' && gamePost && (
          <GamePlayer
            gamePost={gamePost}
            onGuess={handleGuess}
            onShowLeaderboard={() => {
              loadLeaderboard();
              setGameState('leaderboard');
            }}
            hasGuessed={hasGuessed}
            userGuess={userGuess}
          />
        )}

        {gameState === 'leaderboard' && leaderboardData && (
          <Leaderboard
            guesserLeaderboard={leaderboardData.guesserLeaderboard}
            liarLeaderboard={leaderboardData.liarLeaderboard}
            userStats={leaderboardData.userStats}
            onBack={() => gamePost ? setGameState('play') : setGameState('leaderboard')}
            onCreateGame={() => setGameState('create')}
          />
        )}
      </div>
    </CarnivalBackground>
  );
};