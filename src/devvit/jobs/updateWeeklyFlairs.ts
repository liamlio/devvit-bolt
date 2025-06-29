import { Devvit } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';

export const updateWeeklyFlairs = Devvit.addSchedulerJob({
  name: 'UPDATE_WEEKLY_FLAIRS',
  onRun: async (_event, context) => {
    console.log('Starting hourly weekly flair update...');
    
    try {
      const gameService = new GameService(context.redis);
      const gameSettings = await gameService.getGameSettings();
      
      if (!gameSettings.subredditName) {
        console.log('No subreddit configured, skipping flair updates');
        return;
      }

      // Get all users from weekly leaderboards
      const weekNumber = gameService.getWeekNumber();
      const [weeklyGuessers, weeklyLiars] = await Promise.all([
        context.redis.zRange(`leaderboard:guesser:weekly:${weekNumber}`, 0, -1),
        context.redis.zRange(`leaderboard:liar:weekly:${weekNumber}`, 0, -1),
      ]);

      // Collect all unique user IDs from both leaderboards
      const allUserIds = new Set<string>();
      weeklyGuessers.forEach(entry => allUserIds.add(entry.member));
      weeklyLiars.forEach(entry => allUserIds.add(entry.member));

      console.log(`Updating flairs for ${allUserIds.size} users on weekly leaderboards`);

      // Update flair for each user
      let updatedCount = 0;
      for (const userId of allUserIds) {
        try {
          const userScore = await gameService.getUserScore(userId);
          if (userScore.username) {
            await gameService.updateUserFlair(userScore.username, gameSettings.subredditName, context.reddit);
            updatedCount++;
          }
        } catch (error) {
          console.error(`Failed to update flair for user ${userId}:`, error);
        }
      }

      console.log(`Successfully updated flairs for ${updatedCount}/${allUserIds.size} users`);

    } catch (error) {
      console.error('Error during weekly flair update:', error);
    }
  },
});