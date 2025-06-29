import { Devvit } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';

// Testing menu item to reset u/liamlio level to 0
export const resetLiamlioLevel = Devvit.addMenuItem({
  label: '[TTOL Testing] Reset u/liamlio Level to 0',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui, reddit } = context;
    
    try {
      const gameService = new GameService(redis);
      const targetUsername = 'u/liamlio';
      const targetUserId = `t2_13bqqk `;
      
      // Get current user score
      const userScore = await gameService.getUserScore(targetUserId);
      
      if (!userScore.username) {
        ui.showToast({ text: 'u/liamlio not found in the system' });
        return;
      }
      
      // Reset to level 0 (0 experience)
      userScore.experience = 0;
      userScore.level = 1; // Will be recalculated
      
      await gameService.updateUserScore(userScore);
      
      // Update flair
      const gameSettings = await gameService.getGameSettings();
      if (gameSettings.subredditName) {
        await gameService.updateUserFlair(targetUsername, gameSettings.subredditName, reddit);
      }
      
      ui.showToast({ text: `Reset u/${targetUsername} to level 0 (0 XP)! 🔄` });
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
    const { redis, ui, reddit } = context;
    
    try {
      const gameService = new GameService(redis);
      const targetUsername = 'liamlio';
      const targetUserId = `user_${targetUsername}`;
      
      // Get current user score
      const userScore = await gameService.getUserScore(targetUserId);
      
      if (!userScore.username) {
        ui.showToast({ text: 'u/liamlio not found in the system' });
        return;
      }
      
      const currentLevel = gameService.getLevelByExperience(userScore.experience);
      
      // Get all levels to find the next one
      const levels = [
        { level: 1, name: 'Rookie Detective', experienceRequired: 1 },
        { level: 2, name: 'Truth Seeker', experienceRequired: 10 },
        { level: 3, name: 'Lie Detector', experienceRequired: 20 },
        { level: 4, name: 'Master Sleuth', experienceRequired: 35 },
        { level: 5, name: 'Truth Master', experienceRequired: 55 },
        { level: 6, name: 'Carnival Legend', experienceRequired: 80 },
        { level: 7, name: 'Ultimate Detective', experienceRequired: 110 },
      ];
      
      const nextLevelIndex = levels.findIndex(l => l.level === currentLevel.level + 1);
      
      if (nextLevelIndex === -1) {
        ui.showToast({ text: `u/${targetUsername} is already at max level (${currentLevel.name})!` });
        return;
      }
      
      const nextLevel = levels[nextLevelIndex];
      
      // Set experience to the minimum required for the next level
      userScore.experience = nextLevel.experienceRequired;
      userScore.level = nextLevel.level;
      
      await gameService.updateUserScore(userScore);
      
      // Update flair
      const gameSettings = await gameService.getGameSettings();
      if (gameSettings.subredditName) {
        await gameService.updateUserFlair(targetUsername, gameSettings.subredditName, reddit);
      }
      
      ui.showToast({ 
        text: `Leveled up u/${targetUsername} to Level ${nextLevel.level}: ${nextLevel.name}! 🎉` 
      });
    } catch (error) {
      console.error('Error leveling up user:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error leveling up user!',
      });
    }
  },
});