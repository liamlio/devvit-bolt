import express from 'express';
import { createServer, getContext, getServerPort } from '@devvit/server';
import { getRedis } from '@devvit/redis';
import { GameService } from './core/game';
import type { 
  ApiResponse, 
  CreateGameRequest, 
  GuessRequest, 
  GuessResponse, 
  LeaderboardResponse,
  GamePost,
  UserGuess
} from '../shared/types/game';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// Get game post data
router.get<{}, ApiResponse<{ gamePost: GamePost; hasGuessed: boolean; userGuess?: UserGuess }>>(
  '/api/post',
  async (_req, res): Promise<void> => {
    try {
      const { postId, userId } = getContext();
      if (!postId) {
        res.status(400).json({ status: 'error', message: 'Post ID is required' });
        return;
      }

      const redis = getRedis();
      const gameService = new GameService(redis);
      
      const gamePost = await gameService.getGamePost(postId);
      if (!gamePost) {
        res.status(404).json({ status: 'error', message: 'Game post not found' });
        return;
      }

      let hasGuessed = false;
      let userGuess: UserGuess | undefined;
      
      if (userId) {
        userGuess = await gameService.getUserGuess(postId, userId);
        hasGuessed = userGuess !== null;
      }

      res.json({
        status: 'success',
        data: { gamePost, hasGuessed, userGuess }
      });
    } catch (error) {
      console.error('Error fetching game post:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
);

// Create a new game post
router.post<{}, ApiResponse<{ postId: string }>, CreateGameRequest>(
  '/api/create-post',
  async (req, res): Promise<void> => {
    try {
      const { truth1, truth2, lie } = req.body;
      const { userId, reddit, scheduler } = getContext();

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Must be logged in to create a post' });
        return;
      }

      if (!reddit) {
        res.status(500).json({ status: 'error', message: 'Reddit API not available' });
        return;
      }

      // Validate input
      if (!truth1?.text || !truth2?.text || !lie?.text) {
        res.status(400).json({ status: 'error', message: 'All statements are required' });
        return;
      }

      const redis = getRedis();
      const gameService = new GameService(redis);
      
      // Check if user has required level
      const userScore = await gameService.getUserScore(userId);
      if (userScore.level < 1 && userScore.experience < 1) {
        res.status(403).json({ 
          status: 'error', 
          message: 'You must reach level 1 by playing at least one game before creating your own post' 
        });
        return;
      }

      // Get current user info
      const user = await reddit.getCurrentUser();
      if (!user) {
        res.status(401).json({ status: 'error', message: 'Unable to get user information' });
        return;
      }

      // Get game settings
      const settings = await gameService.getGameSettings();
      if (!settings.subredditName) {
        res.status(500).json({ status: 'error', message: 'Game not properly configured' });
        return;
      }

      // Create Reddit post
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Can You Spot the Lie? 🎪',
        subredditName: settings.subredditName,
        customPostType: 'ttol',
        preview: (
          <blocks>
            {/* Empty blocks element allows full Devvit app to render */}
          </blocks>
        ),
      });

      // Randomly assign lie position
      const lieIndex = Math.floor(Math.random() * 3);
      
      // Create game post data
      const gamePost: GamePost = {
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

      // Save to Redis
      await gameService.createGamePost(gamePost);
      await gameService.setPostType(post.id, 'game');

      // Schedule post preview update if scheduler is available
      if (scheduler) {
        await scheduler.runJob({
          name: 'UpdatePostPreview',
          data: { postId: post.id },
          runAt: new Date(Date.now() + 1000),
        });
      }

      res.json({
        status: 'success',
        data: { postId: post.id }
      });
    } catch (error) {
      console.error('Error creating game post:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create post' 
      });
    }
  }
);

// Submit a guess
router.post<{}, ApiResponse<GuessResponse>, GuessRequest>(
  '/api/guess',
  async (req, res): Promise<void> => {
    try {
      const { postId, guessIndex } = req.body;
      const { userId, reddit, scheduler } = getContext();

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Must be logged in to guess' });
        return;
      }

      if (!reddit) {
        res.status(500).json({ status: 'error', message: 'Reddit API not available' });
        return;
      }

      if (guessIndex < 0 || guessIndex > 2) {
        res.status(400).json({ status: 'error', message: 'Invalid guess index' });
        return;
      }

      const redis = getRedis();
      const gameService = new GameService(redis);
      
      // Check if user already guessed
      const existingGuess = await gameService.getUserGuess(postId, userId);
      if (existingGuess) {
        res.status(400).json({ status: 'error', message: 'You have already guessed on this post' });
        return;
      }

      // Get game post
      const gamePost = await gameService.getGamePost(postId);
      if (!gamePost) {
        res.status(404).json({ status: 'error', message: 'Game post not found' });
        return;
      }

      // Get current user info
      const user = await reddit.getCurrentUser();
      if (!user) {
        res.status(401).json({ status: 'error', message: 'Unable to get user information' });
        return;
      }

      // Check if user is the author
      if (gamePost.authorId === userId) {
        res.status(400).json({ status: 'error', message: 'You cannot guess on your own post' });
        return;
      }

      // Process the guess
      const isCorrect = guessIndex === gamePost.lieIndex;
      
      // Create user guess record
      const userGuess: UserGuess = {
        userId,
        username: user.username,
        postId,
        guessIndex,
        isCorrect,
        timestamp: Date.now(),
      };

      // Update game post stats
      gamePost.totalGuesses += 1;
      gamePost.guessBreakdown[guessIndex] += 1;
      if (isCorrect) {
        gamePost.correctGuesses += 1;
      }

      // Award experience points (1 for playing, +3 for correct guess)
      const experiencePoints = isCorrect ? 4 : 1;
      const guesserPoints = isCorrect ? 1 : 0;
      
      // Save data and award points
      await Promise.all([
        gameService.saveUserGuess(userGuess),
        gameService.updateGamePost(gamePost),
        gameService.awardExperience(userId, user.username, experiencePoints),
        gameService.awardGuesserPoints(userId, user.username, guesserPoints),
      ]);

      // Award liar points to the author if guess was wrong
      if (!isCorrect) {
        await gameService.awardLiarPoints(gamePost.authorId, gamePost.authorUsername, 1);
      }

      // Get updated user score
      const updatedUserScore = await gameService.getUserScore(userId);
      
      // Check for level up
      const levelUpResult = await gameService.awardExperience(userId, user.username, 0); // Just to check level

      // Schedule flair update if user leveled up and scheduler is available
      if (levelUpResult.leveledUp && scheduler) {
        await scheduler.runJob({
          name: 'UpdateUserFlair',
          data: { userId, username: user.username, level: levelUpResult.newLevel },
          runAt: new Date(Date.now() + 1000),
        });
      }

      res.json({
        status: 'success',
        data: {
          isCorrect,
          lieIndex: gamePost.lieIndex,
          gamePost,
          userScore: updatedUserScore,
          leveledUp: levelUpResult.leveledUp,
          newLevel: levelUpResult.newLevel,
        }
      });
    } catch (error) {
      console.error('Error processing guess:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process guess' 
      });
    }
  }
);

// Get leaderboard data
router.get<{}, ApiResponse<LeaderboardResponse>>(
  '/api/leaderboard',
  async (_req, res): Promise<void> => {
    try {
      const { userId } = getContext();
      const redis = getRedis();
      const gameService = new GameService(redis);

      const [guesserLeaderboard, liarLeaderboard] = await Promise.all([
        gameService.getLeaderboard('guesser', 'alltime', 10),
        gameService.getLeaderboard('liar', 'alltime', 10),
      ]);

      let userStats;
      if (userId) {
        userStats = await gameService.getUserScore(userId);
      }

      res.json({
        status: 'success',
        data: {
          guesserLeaderboard,
          liarLeaderboard,
          userStats,
        }
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to fetch leaderboard' 
      });
    }
  }
);

// Check post type
router.get<{}, ApiResponse<{ postType: 'game' | 'pinned' | null }>>(
  '/api/post-type',
  async (_req, res): Promise<void> => {
    try {
      const { postId } = getContext();
      if (!postId) {
        res.status(400).json({ status: 'error', message: 'Post ID is required' });
        return;
      }

      const redis = getRedis();
      const gameService = new GameService(redis);
      const postType = await gameService.getPostType(postId);

      res.json({
        status: 'success',
        data: { postType }
      });
    } catch (error) {
      console.error('Error checking post type:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to check post type' 
      });
    }
  }
);

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`Server error: ${err.stack}`));
server.listen(port, () => console.log(`Two Truths One Lie server running on http://localhost:${port}`));