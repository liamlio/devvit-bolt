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

// MOVED: Menu item for populating test leaderboard data
Devvit.addMenuItem({
  label: '[TTOL Testing] Add Test Leaderboard Data',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui, reddit } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      // Test users for guesser leaderboard (sorted by score descending)
      const testGuessers = [
        { username: 'DetectiveMaster_test_ttol', guesserPoints: 95, liarPoints: 12 },
        { username: 'TruthSeeker42_test_ttol', guesserPoints: 87, liarPoints: 8 },
        { username: 'LieSpotter_test_ttol', guesserPoints: 79, liarPoints: 15 },
        { username: 'SherlockFan_test_ttol', guesserPoints: 72, liarPoints: 6 },
        { username: 'MysteryLover_test_ttol', guesserPoints: 68, liarPoints: 11 },
        { username: 'ClueHunter_test_ttol', guesserPoints: 61, liarPoints: 9 },
        { username: 'PuzzleSolver_test_ttol', guesserPoints: 55, liarPoints: 7 },
        { username: 'FactChecker_test_ttol', guesserPoints: 48, liarPoints: 13 },
        { username: 'TruthHound_test_ttol', guesserPoints: 42, liarPoints: 5 },
        { username: 'DeductionKing_test_ttol', guesserPoints: 38, liarPoints: 10 },
      ];

      // Test users for liar leaderboard (sorted by score descending)
      const testLiars = [
        { username: 'MasterDeceiver_test_ttol', guesserPoints: 25, liarPoints: 89 },
        { username: 'SilverTongue_test_ttol', guesserPoints: 31, liarPoints: 82 },
        { username: 'TricksterPro_test_ttol', guesserPoints: 18, liarPoints: 76 },
        { username: 'FibMaster_test_ttol', guesserPoints: 22, liarPoints: 71 },
        { username: 'BluffKing_test_ttol', guesserPoints: 29, liarPoints: 67 },
        { username: 'StorySpinner_test_ttol', guesserPoints: 15, liarPoints: 63 },
        { username: 'TaleWeaver_test_ttol', guesserPoints: 33, liarPoints: 58 },
        { username: 'CraftyCarnival_test_ttol', guesserPoints: 27, liarPoints: 54 },
        { username: 'SlyFox_test_ttol', guesserPoints: 19, liarPoints: 49 },
        { username: 'CharmingLiar_test_ttol', guesserPoints: 24, liarPoints: 45 },
      ];

      // Create fake user IDs and populate data
      const weekNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
      
      for (let i = 0; i < testGuessers.length; i++) {
        const guesser = testGuessers[i];
        const fakeUserId = `test_user_guesser_${i + 1}_test_ttol`;
        
        // Create user score
        const userScore = {
          userId: fakeUserId,
          username: guesser.username,
          guesserPoints: guesser.guesserPoints,
          liarPoints: guesser.liarPoints,
          weeklyGuesserPoints: Math.floor(guesser.guesserPoints * 0.3), // 30% of total for this week
          weeklyLiarPoints: Math.floor(guesser.liarPoints * 0.3),
          level: gameService.getLevelByExperience(guesser.guesserPoints + guesser.liarPoints).level,
          experience: guesser.guesserPoints + guesser.liarPoints,
          totalGames: Math.floor((guesser.guesserPoints + guesser.liarPoints) / 2),
          correctGuesses: Math.floor(guesser.guesserPoints * 0.8), // 80% accuracy
        };
        
        await gameService.updateUserScore(userScore);
        
        // Set user flair for test users
        try {
          await gameService.updateUserFlair(guesser.username, subreddit.name, reddit);
        } catch (error) {
          console.log(`Could not set flair for test user ${guesser.username}:`, error);
        }
      }

      for (let i = 0; i < testLiars.length; i++) {
        const liar = testLiars[i];
        const fakeUserId = `test_user_liar_${i + 1}_test_ttol`;
        
        // Create user score
        const userScore = {
          userId: fakeUserId,
          username: liar.username,
          guesserPoints: liar.guesserPoints,
          liarPoints: liar.liarPoints,
          weeklyGuesserPoints: Math.floor(liar.guesserPoints * 0.3),
          weeklyLiarPoints: Math.floor(liar.liarPoints * 0.3),
          level: gameService.getLevelByExperience(liar.guesserPoints + liar.liarPoints).level,
          experience: liar.guesserPoints + liar.liarPoints,
          totalGames: Math.floor((liar.guesserPoints + liar.liarPoints) / 3),
          correctGuesses: Math.floor(liar.guesserPoints * 0.6), // 60% accuracy
        };
        
        await gameService.updateUserScore(userScore);
        
        // Set user flair for test users
        try {
          await gameService.updateUserFlair(liar.username, subreddit.name, reddit);
        } catch (error) {
          console.log(`Could not set flair for test user ${liar.username}:`, error);
        }
      }
      
      ui.showToast({ text: 'Added 20 test users to leaderboards with flairs! 🎪' });
    } catch (error) {
      console.error('Error adding test data:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error adding test data!',
      });
    }
  },
});

// MOVED & UPDATED: Menu item for clearing test leaderboard data
Devvit.addMenuItem({
  label: '[TTOL Testing] Clear Test Leaderboard Data',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui } = context;
    
    try {
      const gameService = new GameService(redis);
      const weekNumber = gameService.getWeekNumber();
      
      console.log('🧹 Starting test user cleanup...');
      console.log(`📅 Current week number: ${weekNumber}`);
      
      // Get all leaderboard entries to find test users
      const leaderboardKeys = [
        'leaderboard:guesser:alltime',
        'leaderboard:liar:alltime',
        `leaderboard:guesser:weekly:${weekNumber}`,
        `leaderboard:liar:weekly:${weekNumber}`,
      ];
      
      console.log(`🔍 Checking leaderboards:`, leaderboardKeys);
      
      const allEntries = await Promise.all(
        leaderboardKeys.map(key => redis.zRange(key, 0, -1))
      );
      
      // Collect all test user IDs (those containing "_test_ttol" OR "Users_ttol")
      const testUserIds = new Set<string>();
      
      // Check all leaderboard entries for test users
      allEntries.flat().forEach(entry => {
        if (entry.member.includes('_test_ttol') || entry.member.includes('Users_ttol')) {
          testUserIds.add(entry.member);
        }
      });
      
      console.log('🎯 Found test user IDs to remove:', Array.from(testUserIds));
      
      if (testUserIds.size === 0) {
        ui.showToast({ text: 'No test users found to remove! 🧹' });
        return;
      }
      
      // Remove test users from ALL leaderboards (both weekly and all-time)
      const removalPromises = [];
      const testUserArray = Array.from(testUserIds);
      
      // Remove from all current leaderboards
      for (const key of leaderboardKeys) {
        console.log(`🗑️ Removing ${testUserArray.length} test users from ${key}`);
        removalPromises.push(redis.zRem(key, testUserArray));
      }
      
      // Also check and remove from previous weeks (last 4 weeks)
      for (let i = 1; i <= 4; i++) {
        const prevWeekNumber = weekNumber - i;
        const prevWeekKeys = [
          `leaderboard:guesser:weekly:${prevWeekNumber}`,
          `leaderboard:liar:weekly:${prevWeekNumber}`,
        ];
        
        for (const key of prevWeekKeys) {
          console.log(`🗑️ Removing test users from previous week: ${key}`);
          removalPromises.push(redis.zRem(key, testUserArray));
        }
      }
      
      // Remove test user scores
      testUserArray.forEach(userId => {
        console.log(`🗑️ Removing user score data for: ${userId}`);
        removalPromises.push(redis.del(`user_score:${userId}`));
      });
      
      await Promise.all(removalPromises);
      
      console.log(`✅ Successfully removed ${testUserIds.size} test users from all leaderboards and user data`);
      ui.showToast({ text: `Cleared ${testUserIds.size} test users from all leaderboards! 🧹` });
      
    } catch (error) {
      console.error('❌ Error clearing test data:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error clearing test data!',
      });
    }
  },
});