import { Devvit } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';

export const resetWeeklyLeaderboards = Devvit.addSchedulerJob({
  name: 'RESET_WEEKLY_LEADERBOARDS',
  onRun: async (_event, context) => {
    console.log('Starting weekly leaderboard reset...');
    
    try {
      const gameService = new GameService(context.redis);
      const gameSettings = await gameService.getGameSettings();
      
      if (!gameSettings.subredditName) {
        console.log('No subreddit configured, skipping leaderboard reset');
        return;
      }

      const currentWeekNumber = gameService.getWeekNumber();
      const previousWeekNumber = currentWeekNumber - 1;

      // Get all users from the previous week's leaderboards before reset
      const [prevWeekGuessers, prevWeekLiars] = await Promise.all([
        context.redis.zRange(`leaderboard:guesser:weekly:${previousWeekNumber}`, 0, -1),
        context.redis.zRange(`leaderboard:liar:weekly:${previousWeekNumber}`, 0, -1),
      ]);

      // Collect all unique user IDs from previous week
      const prevWeekUserIds = new Set<string>();
      prevWeekGuessers.forEach(entry => prevWeekUserIds.add(entry.member));
      prevWeekLiars.forEach(entry => prevWeekUserIds.add(entry.member));

      console.log(`Resetting weekly scores for ${prevWeekUserIds.size} users from previous week`);

      // Reset weekly scores for all users and update their flairs
      let resetCount = 0;
      for (const userId of prevWeekUserIds) {
        try {
          const userScore = await gameService.getUserScore(userId);
          if (userScore.username) {
            // Reset weekly scores
            userScore.weeklyGuesserPoints = 0;
            userScore.weeklyLiarPoints = 0;
            await gameService.updateUserScore(userScore);
            
            // Update flair to show "Unranked" for weekly positions
            await gameService.updateUserFlair(userScore.username, gameSettings.subredditName, context.reddit);
            resetCount++;
          }
        } catch (error) {
          console.error(`Failed to reset weekly scores for user ${userId}:`, error);
        }
      }

      // Clean up old weekly leaderboard data (keep last 4 weeks)
      const weeksToKeep = 4;
      const oldestWeekToKeep = currentWeekNumber - weeksToKeep;
      
      for (let week = oldestWeekToKeep - 10; week < oldestWeekToKeep; week++) {
        try {
          await Promise.all([
            context.redis.del(`leaderboard:guesser:weekly:${week}`),
            context.redis.del(`leaderboard:liar:weekly:${week}`),
          ]);
          console.log(`Cleaned up leaderboard data for week ${week}`);
        } catch (error) {
          console.error(`Failed to clean up week ${week} data:`, error);
        }
      }

      console.log(`Successfully reset weekly scores and updated flairs for ${resetCount}/${prevWeekUserIds.size} users`);
      console.log(`Weekly leaderboard reset complete for week ${currentWeekNumber}`);

    } catch (error) {
      console.error('Error during weekly leaderboard reset:', error);
    }
  },
});