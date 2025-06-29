import { Devvit } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';

export const userLevelUp = Devvit.addSchedulerJob({
  name: 'USER_LEVEL_UP',
  onRun: async (
    event: {
      data: {
        userId: string;
        username: string;
        oldLevel: number;
        newLevel: number;
        experience: number;
        subredditName: string;
      };
    },
    context
  ) => {
    if (!event.data) return;

    const { userId, username, oldLevel, newLevel, experience, subredditName } = event.data;

    try {
      const gameService = new GameService(context.redis);
      const levelInfo = gameService.getLevelByExperience(experience);

      // Get user's current leaderboard positions for the message
      const [weeklyGuesserRank, weeklyLiarRank, allTimeGuesserRank, allTimeLiarRank] = await Promise.all([
        gameService.getUserLeaderboardRank(userId, 'guesser', 'weekly'),
        gameService.getUserLeaderboardRank(userId, 'liar', 'weekly'),
        gameService.getUserLeaderboardRank(userId, 'guesser', 'alltime'),
        gameService.getUserLeaderboardRank(userId, 'liar', 'alltime'),
      ]);

      // Format rank display
      const formatRank = (rank: number | null): string => {
        if (!rank) return 'Unranked';
        if (rank === 1) return '🥇 1st place';
        if (rank === 2) return '🥈 2nd place';
        if (rank === 3) return '🥉 3rd place';
        return `#${rank}`;
      };

      // Create level-specific congratulations message
      const getLevelMessage = (level: number): string => {
        switch (level) {
          case 1: return "Welcome to the carnival! You're no longer a Huge Clown - you've earned your stripes as a proper Clown! 🎪";
          case 2: return "Elementary, my dear player! You've become a Rookie Detective and are starting to see through the lies! 🕵️";
          case 3: return "Your intuition is sharpening! As a Truth Seeker, you're developing a keen eye for deception! 🔍";
          case 4: return "Impressive! You've become a Lie Detector - falsehoods can't hide from you anymore! 🎯";
          case 5: return "Masterful work! As a Master Sleuth, you're among the elite truth-finders in the carnival! 🔎";
          case 6: return "Legendary status achieved! You are now a Truth Master - few can match your deductive skills! 👑";
          case 7: return "Ultimate achievement unlocked! You are now the Ultimate Detective - the highest honor in our carnival! 🏆"; // SWAPPED
          case 8: return "You've become a Carnival Legend! Your reputation for spotting lies precedes you throughout the land! 🎪"; // SWAPPED
          default: return "Congratulations on your level up! Keep playing to unlock more achievements! 🎉";
        }
      };

      // Get next level info for progression guidance
      const getNextLevelInfo = (currentLevel: number): string => {
        // UPDATED: New XP requirements with swapped titles
        const levels = [
          { level: 0, name: 'Huge Clown', experienceRequired: 0 },
          { level: 1, name: 'Clown', experienceRequired: 1 },
          { level: 2, name: 'Rookie Detective', experienceRequired: 20 },
          { level: 3, name: 'Truth Seeker', experienceRequired: 40 },
          { level: 4, name: 'Lie Detector', experienceRequired: 70 },
          { level: 5, name: 'Master Sleuth', experienceRequired: 110 },
          { level: 6, name: 'Truth Master', experienceRequired: 160 },
          { level: 7, name: 'Ultimate Detective', experienceRequired: 220 }, // SWAPPED
          { level: 8, name: 'Carnival Legend', experienceRequired: 300 }, // SWAPPED
        ];

        const nextLevelIndex = levels.findIndex(l => l.level === currentLevel + 1);
        if (nextLevelIndex === -1) {
          return "\n🏆 **You've reached the maximum level!** You are truly the Carnival Legend of our community!"; // UPDATED
        }

        const nextLevel = levels[nextLevelIndex];
        const experienceNeeded = nextLevel.experienceRequired - experience;
        return `\n🎯 **Next Goal:** Reach Level ${nextLevel.level} (${nextLevel.name}) by earning ${experienceNeeded} more XP!`;
      };

      // Send congratulatory private message
      await context.reddit.sendPrivateMessage({
        to: username,
        subject: `🎪 Level Up! Welcome to Level ${newLevel}: ${levelInfo.name}! 🎪`,
        text: `🎉 **Congratulations, ${username}!** 🎉

${getLevelMessage(newLevel)}

**🎪 Your New Status:**
- **Level:** ${newLevel} - ${levelInfo.name}
- **Experience:** ${experience} XP
- **Previous Level:** ${oldLevel} → **Current Level:** ${newLevel}

**🏆 Your Current Leaderboard Positions:**

**📅 This Week:**
- 🕵️ Guesser Rank: ${formatRank(weeklyGuesserRank)}
- 🎭 Liar Rank: ${formatRank(weeklyLiarRank)}

**🏆 All-Time:**
- 🕵️ Guesser Rank: ${formatRank(allTimeGuesserRank)}
- 🎭 Liar Rank: ${formatRank(allTimeLiarRank)}

**🎨 Your New Flair:**
Your user flair in r/${subredditName} has been automatically updated to reflect your new level and current stats!

**💡 How to Keep Earning XP:**
- **Play any game:** +1 XP
- **Guess correctly:** +2 XP total
- **Create engaging posts:** +10 XP bonus when your post gets 5+ guesses!
- **Help others earn XP:** Climb the liar leaderboard when players guess incorrectly!

${getNextLevelInfo(newLevel)}

Keep up the fantastic work in the carnival of deception! 🎪✨

---
*This message was sent automatically by the Two Truths One Lie bot. Visit r/${subredditName} to continue playing!*`,
      });

      console.log(`Successfully sent level-up message to u/${username} for reaching Level ${newLevel}: ${levelInfo.name}`);

    } catch (error) {
      console.error(`Failed to send level-up message to u/${username}:`, error);
    }
  },
});