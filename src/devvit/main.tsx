import { Devvit } from '@devvit/public-api';
import { Router } from './posts/Router.js';
import { GameService } from './service/GameService.js';

// Import the level-up job
import './jobs/userLevelUp.js';

// Import the new flair management jobs
import './jobs/updateWeeklyFlairs.js';
import './jobs/resetWeeklyLeaderboards.js';

// Import testing menu items
import './testing/testingMenuItems.js';

// Configure Devvit with userActions enabled
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
  userActions: true, // Enable posting as user
});

// Add the custom post type
Devvit.addCustomPostType({
  name: 'ttol',
  height: 'tall',
  render: (context) => {
    return (
      <Router 
        context={context}
      />
    );
  },
});

// Menu item for creating new posts
Devvit.addMenuItem({
  label: '[TTOL] New Two Truths One Lie Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Can You Spot the Lie? 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🎪</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Ready to create your game...</text>
            </vstack>
          </blocks>
        ),
        runAs: 'USER', // Post as the user, not the app
        userGeneratedContent: {
          text: 'Two Truths One Lie game post created by user'
        },
      });
      
      await gameService.setPostType(post.id, 'game');
      
      ui.showToast({ text: 'Created Two Truths One Lie post! Click on it to configure your game.' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error creating post:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error creating post!',
      });
    }
  },
});

// Menu item for installing the game
Devvit.addMenuItem({
  label: '[TTOL] Install Game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis, scheduler } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Community Hub 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🏆</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Community Hub</text>
            </vstack>
          </blocks>
        ),
        runAs: 'USER', // Post as the user, not the app
        userGeneratedContent: {
          text: 'Two Truths One Lie community hub created by moderator'
        },
      });
      
      await Promise.all([
        post.sticky(),
        gameService.setPinnedPost(post.id),
        gameService.setPostType(post.id, 'pinned'),
        gameService.setGameSettings({ subredditName: subreddit.name }),
      ]);

      // Schedule recurring jobs for flair management
      const now = new Date();
      
      // Schedule hourly flair updates (every hour on the hour)
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      
      await scheduler.runJob({
        name: 'UPDATE_WEEKLY_FLAIRS',
        runAt: nextHour,
        cron: '0 * * * *', // Every hour on the hour
      });

      // Schedule weekly leaderboard reset (every Monday at 00:00 UTC)
      const nextMonday = new Date(now);
      const daysUntilMonday = (1 + 7 - nextMonday.getDay()) % 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      
      await scheduler.runJob({
        name: 'RESET_WEEKLY_LEADERBOARDS',
        runAt: nextMonday,
        cron: '0 0 * * 1', // Every Monday at 00:00 UTC
      });
      
      ui.showToast({ text: 'Installed Two Truths One Lie with automated flair management! 🎪' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error installing game:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error installing game!',
      });
    }
  },
});

// Menu item for populating test leaderboard data
Devvit.addMenuItem({
  label: '[TTOL] Add Test Leaderboard Data',
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

// Menu item for clearing test leaderboard data
Devvit.addMenuItem({
  label: '[TTOL] Clear Test Leaderboard Data',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui } = context;
    
    try {
      const gameService = new GameService(redis);
      const weekNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
      
      // Get all leaderboard entries to find test users
      const [
        allTimeGuesserEntries,
        allTimeLiarEntries,
        weeklyGuesserEntries,
        weeklyLiarEntries
      ] = await Promise.all([
        redis.zRange('leaderboard:guesser:alltime', 0, -1),
        redis.zRange('leaderboard:liar:alltime', 0, -1),
        redis.zRange(`leaderboard:guesser:weekly:${weekNumber}`, 0, -1),
        redis.zRange(`leaderboard:liar:weekly:${weekNumber}`, 0, -1),
      ]);
      
      // Collect all test user IDs (those containing "_test_ttol")
      const testUserIds = new Set<string>();
      
      // Check all leaderboard entries for test users
      [...allTimeGuesserEntries, ...allTimeLiarEntries, ...weeklyGuesserEntries, ...weeklyLiarEntries]
        .forEach(entry => {
          if (entry.member.includes('_test_ttol')) {
            testUserIds.add(entry.member);
          }
        });
      
      console.log('Found test user IDs to remove:', Array.from(testUserIds));
      
      // Remove test users from all leaderboards
      const removalPromises = [];
      
      if (testUserIds.size > 0) {
        const testUserArray = Array.from(testUserIds);
        
        removalPromises.push(
          redis.zRem('leaderboard:guesser:alltime', testUserArray),
          redis.zRem('leaderboard:liar:alltime', testUserArray),
          redis.zRem(`leaderboard:guesser:weekly:${weekNumber}`, testUserArray),
          redis.zRem(`leaderboard:liar:weekly:${weekNumber}`, testUserArray)
        );
        
        // Remove test user scores
        testUserArray.forEach(userId => {
          removalPromises.push(redis.del(`user_score:${userId}`));
        });
      }
      
      await Promise.all(removalPromises);
      
      ui.showToast({ text: `Cleared ${testUserIds.size} test users from leaderboards! 🧹` });
    } catch (error) {
      console.error('Error clearing test data:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error clearing test data!',
      });
    }
  },
});

// NEW: Manual flair update menu item for testing
Devvit.addMenuItem({
  label: '[TTOL] Update All Weekly Flairs Now',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { scheduler, ui } = context;
    
    try {
      // Trigger the weekly flair update job immediately
      await scheduler.runJob({
        name: 'UPDATE_WEEKLY_FLAIRS',
        runAt: new Date(), // Run immediately
      });
      
      ui.showToast({ text: 'Triggered weekly flair update job! Check logs for progress. 🎪' });
    } catch (error) {
      console.error('Error triggering flair update:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error triggering flair update!',
      });
    }
  },
});

// Handle webview messages
Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
    // Handle webview form submissions here if needed
    console.log('Post submitted:', event);
  },
});

export default Devvit;