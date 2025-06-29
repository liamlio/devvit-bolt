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

// NEW: Test menu item to force update all weekly leaderboard users' flairs with debugging
Devvit.addMenuItem({
  label: '[TTOL Testing] Force Update Weekly Flairs',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { redis, ui, reddit } = context;
    
    try {
      const gameService = new GameService(redis);
      const gameSettings = await gameService.getGameSettings();
      
      if (!gameSettings.subredditName) {
        ui.showToast({ text: 'No subreddit configured! Install the game first.' });
        return;
      }

      console.log('🔧 Starting force flair update with enhanced debugging...');

      // Get all users from current weekly leaderboards
      const weekNumber = gameService.getWeekNumber();
      console.log(`📅 Current week number: ${weekNumber}`);
      
      const [weeklyGuessers, weeklyLiars] = await Promise.all([
        redis.zRange(`leaderboard:guesser:weekly:${weekNumber}`, 0, -1, { withScores: true, reverse: true }),
        redis.zRange(`leaderboard:liar:weekly:${weekNumber}`, 0, -1, { withScores: true, reverse: true }),
      ]);

      console.log(`📊 Weekly guesser leaderboard (${weeklyGuessers.length} entries):`, weeklyGuessers);
      console.log(`📊 Weekly liar leaderboard (${weeklyLiars.length} entries):`, weeklyLiars);

      // Collect all unique user IDs from both leaderboards
      const allUserIds = new Set<string>();
      weeklyGuessers.forEach(entry => allUserIds.add(entry.member));
      weeklyLiars.forEach(entry => allUserIds.add(entry.member));

      if (allUserIds.size === 0) {
        ui.showToast({ text: 'No users found on weekly leaderboards! Add test data first.' });
        return;
      }

      console.log(`🎯 Force updating flairs for ${allUserIds.size} unique users on weekly leaderboards`);

      // Update flair for each user
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const userId of allUserIds) {
        try {
          console.log(`\n🔍 Processing user: ${userId}`);
          const userScore = await gameService.getUserScore(userId);
          console.log(`📊 User score data:`, userScore);
          
          if (userScore.username) {
            console.log(`🎨 Updating flair for u/${userScore.username}...`);
            await gameService.updateUserFlair(userScore.username, gameSettings.subredditName, reddit);
            updatedCount++;
            console.log(`✅ Successfully updated flair for u/${userScore.username}`);
          } else {
            console.log(`⚠️ No username found for user ${userId}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to update flair for user ${userId}:`, error);
          errorCount++;
        }
      }

      const successMessage = `Updated ${updatedCount}/${allUserIds.size} weekly leaderboard flairs! 🎪`;
      const errorMessage = errorCount > 0 ? ` (${errorCount} errors - check logs)` : '';
      
      ui.showToast({ text: successMessage + errorMessage });
      console.log(`🏁 Force flair update complete: ${updatedCount} success, ${errorCount} errors`);

    } catch (error) {
      console.error('❌ Error during force flair update:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error updating flairs!',
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