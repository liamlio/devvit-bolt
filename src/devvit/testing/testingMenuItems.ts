import { Devvit } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';

// Testing menu item to reset u/liamlio level to 0
export const resetLiamlioLevel = Devvit.addMenuItem({
  label: '[TTOL Testing] Reset u/liamlio Level to 0',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui, reddit, scheduler } = context;
    
    try {
      const gameService = new GameService(redis);
      const targetUsername = 'liamlio';
      const targetUserId = `t2_13bqqk`;
      
      // Get current user score
      const userScore = await gameService.getUserScore(targetUserId);
      
      // Set username if not already set
      if (!userScore.username) {
        userScore.username = targetUsername;
      }
      
      // Reset to level 0 (0 experience)
      userScore.experience = 0;
      userScore.level = 0; // Will be recalculated to level 0 (Huge Clown)
      
      await gameService.updateUserScore(userScore, reddit, scheduler);
      
      // Update flair
      const gameSettings = await gameService.getGameSettings();
      if (gameSettings.subredditName) {
        await gameService.updateUserFlair(targetUsername, gameSettings.subredditName, reddit);
      }
      
      ui.showToast({ text: `Reset u/${targetUsername} to Level 0: Huge Clown (0 XP)! 🤡` });
    } catch (error) {
      console.error('Error resetting user level:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error resetting user level!',
      });
    }
  },
});

// Testing menu item to level up u/liamlio by 1 level
export const levelUpLiamlio = Devvit.addMenuItem({
  label: '[TTOL Testing] Level Up u/liamlio by 1',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui, reddit, scheduler } = context;
    
    try {
      const gameService = new GameService(redis);
      const targetUsername = 'liamlio';
      const targetUserId = `t2_13bqqk`;
      
      console.log(`🧪 Starting manual level up for u/${targetUsername}...`);
      
      // Get current user score
      const userScore = await gameService.getUserScore(targetUserId);
      console.log(`📊 Current user score:`, userScore);
      
      // Set username if not already set
      if (!userScore.username) {
        userScore.username = targetUsername;
      }
      
      const currentLevel = gameService.getLevelByExperience(userScore.experience);
      console.log(`📈 Current level: ${currentLevel.level} (${currentLevel.name})`);
      
      // Get all levels to find the next one (now 9 levels: 0-8)
      const levels = [
        { level: 0, name: 'Huge Clown', experienceRequired: 0 },
        { level: 1, name: 'Clown', experienceRequired: 1 },
        { level: 2, name: 'Rookie Detective', experienceRequired: 10 },
        { level: 3, name: 'Truth Seeker', experienceRequired: 20 },
        { level: 4, name: 'Lie Detector', experienceRequired: 35 },
        { level: 5, name: 'Master Sleuth', experienceRequired: 55 },
        { level: 6, name: 'Truth Master', experienceRequired: 80 },
        { level: 7, name: 'Carnival Legend', experienceRequired: 110 },
        { level: 8, name: 'Ultimate Detective', experienceRequired: 150 },
      ];
      
      const nextLevelIndex = levels.findIndex(l => l.level === currentLevel.level + 1);
      
      if (nextLevelIndex === -1) {
        ui.showToast({ text: `u/${targetUsername} is already at max level (${currentLevel.name})!` });
        return;
      }
      
      const nextLevel = levels[nextLevelIndex];
      console.log(`🎯 Target level: ${nextLevel.level} (${nextLevel.name}) - requires ${nextLevel.experienceRequired} XP`);
      
      // Set experience to the minimum required for the next level
      const oldExperience = userScore.experience;
      const oldLevel = userScore.level;
      userScore.experience = nextLevel.experienceRequired;
      userScore.level = nextLevel.level;
      
      console.log(`⬆️ Updating user score: ${oldExperience} XP → ${userScore.experience} XP`);
      console.log(`🎪 Level change: ${oldLevel} → ${userScore.level}`);
      console.log(`📧 Scheduler available:`, !!scheduler);
      console.log(`🌐 Reddit API available:`, !!reddit);
      
      // CRITICAL: Pass scheduler context to updateUserScore
      const result = await gameService.updateUserScore(userScore, reddit, scheduler);
      console.log(`✅ Update result:`, result);
      
      // Update flair
      const gameSettings = await gameService.getGameSettings();
      if (gameSettings.subredditName) {
        console.log(`🎨 Updating flair for u/${targetUsername} in r/${gameSettings.subredditName}`);
        await gameService.updateUserFlair(targetUsername, gameSettings.subredditName, reddit);
      }
      
      ui.showToast({ 
        text: `Leveled up u/${targetUsername} to Level ${nextLevel.level}: ${nextLevel.name}! Check for PM in ~10 seconds 📧` 
      });
      
      console.log(`🏁 Manual level up complete for u/${targetUsername}`);
    } catch (error) {
      console.error('❌ Error leveling up user:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error leveling up user!',
      });
    }
  },
});

// NEW: Testing menu item to manually trigger a level-up message
export const testLevelUpMessage = Devvit.addMenuItem({
  label: '[TTOL Testing] Send Test Level-Up Message',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui, reddit, scheduler } = context;
    
    try {
      const gameService = new GameService(redis);
      const targetUsername = 'liamlio';
      const targetUserId = `t2_13bqqk`;
      
      console.log(`📧 Testing level-up message for u/${targetUsername}...`);
      
      const userScore = await gameService.getUserScore(targetUserId);
      const gameSettings = await gameService.getGameSettings();
      
      if (!gameSettings.subredditName) {
        ui.showToast({ text: 'No subreddit configured! Install the game first.' });
        return;
      }
      
      // Manually trigger the level-up job
      await scheduler.runJob({
        name: 'USER_LEVEL_UP',
        data: {
          userId: targetUserId,
          username: targetUsername,
          oldLevel: Math.max(0, userScore.level - 1),
          newLevel: userScore.level,
          experience: userScore.experience,
          subredditName: gameSettings.subredditName,
        },
        runAt: new Date(Date.now() + 2000), // Send in 2 seconds
      });
      
      console.log(`📬 Scheduled test level-up message for u/${targetUsername}`);
      ui.showToast({ text: `Scheduled test level-up message for u/${targetUsername}! Check PMs in ~5 seconds 📧` });
      
    } catch (error) {
      console.error('❌ Error sending test level-up message:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error sending test message!',
      });
    }
  },
});