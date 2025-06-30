import type { GamePost, UserGuess, UserScore, LeaderboardEntry } from '../../shared/types/game.js';

export class GameService {
  constructor(private redis: any) {}

  // Game Post Management
  async createGamePost(gamePost: GamePost): Promise<void> {
    const key = `game_post:${gamePost.postId}`;
    await this.redis.set(key, JSON.stringify(gamePost));
  }

  async getGamePost(postId: string): Promise<GamePost | null> {
    const key = `game_post:${postId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateGamePost(gamePost: GamePost): Promise<void> {
    await this.createGamePost(gamePost);
    
    // Check if this post just reached 5 guesses and award bonus XP
    if (gamePost.totalGuesses === 5) {
      await this.awardPostEngagementBonus(gamePost.postId, gamePost.authorId, gamePost.authorUsername);
    }
  }

  // NEW: Award bonus XP for posts that reach 5 guesses
  private async awardPostEngagementBonus(postId: string, authorId: string, authorUsername: string): Promise<void> {
    try {
      // Check if we've already awarded the bonus for this post
      const bonusKey = `post_engagement_bonus:${postId}`;
      const alreadyAwarded = await this.redis.get(bonusKey);
      
      if (alreadyAwarded) {
        console.log(`🎯 Engagement bonus already awarded for post ${postId}`);
        return;
      }

      // Award 10 XP for creating an engaging post
      const bonusXP = 10;
      console.log(`🎉 Awarding ${bonusXP} XP engagement bonus to u/${authorUsername} for post ${postId} reaching 5 guesses!`);
      
      const userScore = await this.getUserScore(authorId);
      userScore.username = authorUsername;
      userScore.experience += bonusXP;
      
      await this.updateUserScore(userScore);
      
      // Mark this post as having received the bonus
      await this.redis.set(bonusKey, 'true');
      
      console.log(`✅ Successfully awarded engagement bonus to u/${authorUsername}. New XP: ${userScore.experience}`);
      
    } catch (error) {
      console.error(`❌ Error awarding engagement bonus for post ${postId}:`, error);
    }
  }

  // User Guess Management
  async saveUserGuess(guess: UserGuess): Promise<void> {
    const key = `user_guess:${guess.postId}:${guess.userId}`;
    await this.redis.set(key, JSON.stringify(guess));
  }

  async getUserGuess(postId: string, userId: string): Promise<UserGuess | null> {
    const key = `user_guess:${postId}:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // TESTING EXCEPTION: Method to remove user guess for u/liamlio testing
  // This is for testing purposes only and should be removed in production
  async removeUserGuess(postId: string, userId: string): Promise<void> {
    const key = `user_guess:${postId}:${userId}`;
    await this.redis.del(key);
  }

  // User Score Management
  async getUserScore(userId: string): Promise<UserScore> {
    const key = `user_score:${userId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return {
      userId,
      username: '',
      guesserPoints: 0,
      liarPoints: 0,
      weeklyGuesserPoints: 0,
      weeklyLiarPoints: 0,
      level: 0, // Start at level 0 (Huge Clown)
      experience: 0,
      totalGames: 0,
      correctGuesses: 0,
    };
  }

  async updateUserScore(userScore: UserScore, reddit?: any, scheduler?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const oldLevel = userScore.level;
    const newLevel = this.getLevelByExperience(userScore.experience);
    userScore.level = newLevel.level;
    
    console.log(`📊 Updating user score for u/${userScore.username}:`, {
      oldLevel,
      newLevel: newLevel.level,
      experience: userScore.experience,
      guesserPoints: userScore.guesserPoints,
      liarPoints: userScore.liarPoints,
      weeklyGuesserPoints: userScore.weeklyGuesserPoints,
      weeklyLiarPoints: userScore.weeklyLiarPoints,
      hasScheduler: !!scheduler,
      hasReddit: !!reddit,
    });
    
    const key = `user_score:${userScore.userId}`;
    await this.redis.set(key, JSON.stringify(userScore));

    // CRITICAL: Update leaderboards immediately after updating user score
    await this.updateLeaderboards(userScore);

    const leveledUp = newLevel.level > oldLevel;
    
    // Schedule level-up notification if user leveled up
    if (leveledUp && scheduler && reddit) {
      try {
        const gameSettings = await this.getGameSettings();
        if (gameSettings.subredditName) {
          console.log(`📧 Scheduling level-up notification for u/${userScore.username}: Level ${oldLevel} → ${newLevel.level}`);
          
          const jobData = {
            userId: userScore.userId,
            username: userScore.username,
            oldLevel,
            newLevel: newLevel.level,
            experience: userScore.experience,
            subredditName: gameSettings.subredditName,
          };
          
          console.log(`📬 Job data:`, jobData);
          
          const jobResult = await scheduler.runJob({
            name: 'USER_LEVEL_UP',
            data: jobData,
            runAt: new Date(Date.now() + 5000), // Send message after 5 seconds
          });
          
          console.log(`✅ Successfully scheduled level-up job:`, jobResult);
        } else {
          console.log(`⚠️ No subreddit name configured, skipping level-up notification`);
        }
      } catch (error) {
        console.error(`❌ Failed to schedule level-up notification for u/${userScore.username}:`, error);
      }
    } else {
      if (leveledUp) {
        console.log(`⚠️ Level up detected but missing context:`, {
          leveledUp,
          hasScheduler: !!scheduler,
          hasReddit: !!reddit,
        });
      }
    }

    return {
      leveledUp,
      newLevel: leveledUp ? newLevel.level : undefined,
    };
  }

  private async updateLeaderboards(userScore: UserScore): Promise<void> {
    const weekNumber = this.getWeekNumber();
    
    console.log(`📊 Updating leaderboards for user ${userScore.username}:`, {
      weeklyGuesserPoints: userScore.weeklyGuesserPoints,
      allTimeGuesserPoints: userScore.guesserPoints,
      weeklyLiarPoints: userScore.weeklyLiarPoints,
      allTimeLiarPoints: userScore.liarPoints,
      weekNumber
    });

    // Update all four leaderboards
    await Promise.all([
      // Weekly leaderboards
      this.redis.zAdd(`leaderboard:guesser:weekly:${weekNumber}`, {
        member: userScore.userId,
        score: userScore.weeklyGuesserPoints,
      }),
      this.redis.zAdd(`leaderboard:liar:weekly:${weekNumber}`, {
        member: userScore.userId,
        score: userScore.weeklyLiarPoints,
      }),
      // All-time leaderboards
      this.redis.zAdd('leaderboard:guesser:alltime', {
        member: userScore.userId,
        score: userScore.guesserPoints,
      }),
      this.redis.zAdd('leaderboard:liar:alltime', {
        member: userScore.userId,
        score: userScore.liarPoints,
      }),
    ]);

    console.log(`✅ Successfully updated leaderboards for user ${userScore.username}`);
  }

  async getLeaderboard(type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime', limit: number = 10): Promise<LeaderboardEntry[]> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    console.log(`Getting leaderboard for ${type} ${timeframe}, key: ${key}`);

    try {
      // Get top entries with scores in descending order
      const results = await this.redis.zRange(key, 0, limit - 1, { 
        withScores: true, 
        reverse: true // This ensures highest scores come first
      });
      
      console.log(`Raw leaderboard results for ${key}:`, results);
      
      const leaderboard: LeaderboardEntry[] = [];
      for (let i = 0; i < results.length; i++) {
        const { member: userId, score } = results[i];
        const userScore = await this.getUserScore(userId);
        
        // FIXED: Apply score filter only for liar leaderboards
        const shouldInclude = type === 'guesser' || score > 0;
        
        if (shouldInclude) {
          leaderboard.push({
            userId,
            username: userScore.username || `User_${userId.slice(-4)}`,
            score,
            rank: i + 1,
          });
        }
      }

      console.log(`Processed leaderboard for ${key}:`, leaderboard);
      return leaderboard;
    } catch (error) {
      console.error(`Error getting leaderboard for ${key}:`, error);
      return [];
    }
  }

  // FIXED: Completely rewritten to avoid zCount and use zRank instead
  async getUserLeaderboardRank(userId: string, type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime'): Promise<number | null> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    console.log(`🔍 Getting user rank for ${userId} in ${key}`);

    try {
      // Get the user's score first
      const userScore = await this.redis.zScore(key, userId);
      
      if (userScore === null || userScore === undefined) {
        console.log(`❌ User ${userId} not found in leaderboard ${key}`);
        return null;
      }
      
      console.log(`📊 User ${userId} score in ${key}: ${userScore}`);
      
      // For liar leaderboards, if user has 0 score, they shouldn't be ranked
      if (type === 'liar' && userScore === 0) {
        console.log(`🎭 User ${userId} has 0 liar points, not ranked in ${key}`);
        return null;
      }
      
      // Use zRevRank to get the rank directly (reverse order for highest scores first)
      const rank = await this.redis.zRevRank(key, userId);
      
      if (rank === null || rank === undefined) {
        console.log(`❌ Could not determine rank for user ${userId} in ${key}`);
        return null;
      }
      
      // zRevRank returns 0-based index, so add 1 for 1-based rank
      const userRank = rank + 1;
      
      console.log(`🏆 User ${userId} rank in ${key}: ${userRank} (score: ${userScore})`);
      
      return userRank;
    } catch (error) {
      console.error(`❌ Error getting user leaderboard rank for ${key}:`, error);
      
      // Fallback to manual counting if zRevRank fails
      try {
        console.log(`🔄 Attempting fallback method for user rank calculation...`);
        
        // Get all entries and manually count higher scores
        const allEntries = await this.redis.zRange(key, 0, -1, { withScores: true });
        
        // Count how many users have a higher score than this user
        let higherScoreCount = 0;
        for (const entry of allEntries) {
          if (entry.score > userScore) {
            higherScoreCount++;
          }
        }
        
        // User's rank is the number of users with higher scores + 1
        const userRank = higherScoreCount + 1;
        
        console.log(`🏆 Fallback: User ${userId} rank in ${key}: ${userRank} (score: ${userScore}, users with higher scores: ${higherScoreCount})`);
        
        return userRank;
      } catch (fallbackError) {
        console.error(`❌ Fallback method also failed for ${key}:`, fallbackError);
        return null;
      }
    }
  }

  // Game Settings
  async getGameSettings(): Promise<{ subredditName: string }> {
    const data = await this.redis.get('game_settings');
    return data ? JSON.parse(data) : { subredditName: '' };
  }

  async setGameSettings(settings: { subredditName: string }): Promise<void> {
    await this.redis.set('game_settings', JSON.stringify(settings));
  }

  // Post Type Management
  async setPostType(postId: string, type: 'game' | 'pinned'): Promise<void> {
    await this.redis.set(`post_type:${postId}`, type);
  }

  async getPostType(postId: string): Promise<'game' | 'pinned' | null> {
    const type = await this.redis.get(`post_type:${postId}`);
    return type as 'game' | 'pinned' | null;
  }

  async setPinnedPost(postId: string): Promise<void> {
    await this.redis.set('pinned_post', postId);
  }

  async getPinnedPost(): Promise<string | null> {
    return await this.redis.get('pinned_post');
  }

  // UPDATED: User Flair Management with better debugging and user lookup
  async updateUserFlair(username: string, subredditName: string, reddit: any): Promise<void> {
    try {
      // Skip flair updates for test users
      if (username.includes('_test_ttol')) {
        console.log(`🧪 Skipping flair update for test user: u/${username}`);
        return;
      }

      console.log(`🎨 Starting flair update for u/${username}`);
      
      // FIXED: Find user by username instead of assuming userId format
      const userScore = await this.findUserByUsername(username);
      
      if (!userScore) {
        console.log(`⚠️ No user score found for u/${username}`);
        return;
      }
      
      console.log(`📊 User score for u/${username}:`, {
        level: userScore.level,
        experience: userScore.experience,
        guesserPoints: userScore.guesserPoints,
        liarPoints: userScore.liarPoints,
        weeklyGuesserPoints: userScore.weeklyGuesserPoints,
        weeklyLiarPoints: userScore.weeklyLiarPoints,
      });
      
      const levelInfo = this.getLevelByExperience(userScore.experience);
      
      // Get user's weekly guesser rank with debugging
      const weeklyGuesserRank = await this.getUserLeaderboardRank(userScore.userId, 'guesser', 'weekly');
      console.log(`🏆 Weekly guesser rank for u/${username}: ${weeklyGuesserRank}`);
      
      // Format the complex flair text: "{level title} | {current EXP} | Weekly guesser rank"
      const rankText = weeklyGuesserRank ? `#${weeklyGuesserRank}` : 'Unranked';
      const flairText = `${levelInfo.name} | ${userScore.experience} XP | ${rankText}`;
      
      console.log(`🎯 Setting flair for u/${username}: "${flairText}"`);
      
      // Set user flair with complex information and carnival-themed color
      await reddit.setUserFlair({
        subredditName,
        username,
        text: flairText,
        backgroundColor: this.getLevelFlairColor(levelInfo.level),
        textColor: 'dark', // Use dark text for better readability
      });
      
      console.log(`✅ Successfully updated flair for u/${username}: "${flairText}" (Level ${levelInfo.level})`);
    } catch (error) {
      console.error(`❌ Error updating flair for u/${username}:`, error);
    }
  }

  // NEW: Helper method to find user by username across all user scores
  private async findUserByUsername(username: string): Promise<UserScore | null> {
    try {
      // First, try to find the user in leaderboards to get their userId
      const weekNumber = this.getWeekNumber();
      const leaderboardKeys = [
        'leaderboard:guesser:alltime',
        'leaderboard:liar:alltime',
        `leaderboard:guesser:weekly:${weekNumber}`,
        `leaderboard:liar:weekly:${weekNumber}`,
      ];

      for (const key of leaderboardKeys) {
        const entries = await this.redis.zRange(key, 0, -1);
        for (const entry of entries) {
          const userScore = await this.getUserScore(entry.member);
          if (userScore.username === username) {
            console.log(`🔍 Found user u/${username} with userId: ${userScore.userId}`);
            return userScore;
          }
        }
      }

      console.log(`🔍 User u/${username} not found in leaderboards, checking if they have any score data...`);
      return null;
    } catch (error) {
      console.error(`Error finding user by username ${username}:`, error);
      return null;
    }
  }

  // UPDATED: Only update flair on level up, not on every point award
  private async updateFlairOnLevelUp(username: string, subredditName: string, reddit: any): Promise<void> {
    try {
      await this.updateUserFlair(username, subredditName, reddit);
      console.log(`Updated flair for ${username} due to level up`);
    } catch (error) {
      console.error(`Error updating flair on level up for ${username}:`, error);
    }
  }

  private getLevelFlairColor(level: number): string {
    // Carnival-themed colors for each level (now 9 levels: 0-8)
    const carnivalColors = [
      '#FF1493', // Level 0 - Deep Pink (Huge Clown)
      '#FF69B4', // Level 1 - Hot Pink (Clown)
      '#87CEEB', // Level 2 - Sky Blue (Rookie Detective)
      '#98FB98', // Level 3 - Pale Green (Truth Seeker)
      '#FFD700', // Level 4 - Gold (Lie Detector)
      '#FF6347', // Level 5 - Tomato Red (Master Sleuth)
      '#DA70D6', // Level 6 - Orchid Purple (Truth Master)
      '#FF4500', // Level 7 - Orange Red (Ultimate Detective) - SWAPPED
      '#8A2BE2', // Level 8 - Blue Violet (Carnival Legend) - SWAPPED
    ];
    
    return carnivalColors[Math.min(level, carnivalColors.length - 1)] || carnivalColors[0];
  }

  // Utility Methods
  getWeekNumber(): number {
    // Use a consistent week calculation based on Unix epoch
    // Week starts on Monday (ISO week)
    const now = new Date();
    const epochStart = new Date('1970-01-05'); // First Monday after epoch
    const diffTime = now.getTime() - epochStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  }

  getLevelByExperience(experience: number): { level: number; name: string } {
    // UPDATED: Swapped level 7 and 8 titles, doubled XP requirements (except level 1)
    const levels = [
      { level: 0, name: 'Huge Clown', experienceRequired: 0 }, // Level 0 - Start here
      { level: 1, name: 'Clown', experienceRequired: 1 }, // Level 1 - UNCHANGED (still 1 XP)
      { level: 2, name: 'Rookie Detective', experienceRequired: 20 }, // Level 2 - DOUBLED (was 10)
      { level: 3, name: 'Truth Seeker', experienceRequired: 40 }, // Level 3 - DOUBLED (was 20)
      { level: 4, name: 'Lie Detector', experienceRequired: 70 }, // Level 4 - DOUBLED (was 35)
      { level: 5, name: 'Master Sleuth', experienceRequired: 110 }, // Level 5 - DOUBLED (was 55)
      { level: 6, name: 'Truth Master', experienceRequired: 160 }, // Level 6 - DOUBLED (was 80)
      { level: 7, name: 'Ultimate Detective', experienceRequired: 220 }, // Level 7 - SWAPPED & DOUBLED (was Carnival Legend, was 110)
      { level: 8, name: 'Carnival Legend', experienceRequired: 300 }, // Level 8 - SWAPPED & DOUBLED (was Ultimate Detective, was 150)
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (experience >= levels[i].experienceRequired) {
        return levels[i];
      }
    }
    return levels[0]; // Return level 0 (Huge Clown) as default
  }

  async awardExperience(userId: string, username: string, points: number, reddit?: any, scheduler?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    console.log(`🎯 Awarding ${points} experience to ${username} (${userId})`);
    
    const userScore = await this.getUserScore(userId);
    const oldLevel = userScore.level;
    userScore.username = username;
    userScore.experience += points;
    
    const result = await this.updateUserScore(userScore, reddit, scheduler);
    console.log(`✅ Experience awarded. New total: ${userScore.experience}`);
    
    // UPDATED: Only update flair if level changed
    if (result.leveledUp && reddit) {
      const gameSettings = await this.getGameSettings();
      if (gameSettings.subredditName) {
        await this.updateFlairOnLevelUp(username, gameSettings.subredditName, reddit);
      }
    }
    
    return result;
  }

  async awardGuesserPoints(userId: string, username: string, points: number, reddit?: any, scheduler?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    console.log(`🎯 Awarding ${points} guesser points to ${username} (${userId})`);
    
    const userScore = await this.getUserScore(userId);
    const oldLevel = userScore.level;
    userScore.username = username;
    userScore.guesserPoints += points;
    userScore.weeklyGuesserPoints += points;
    userScore.totalGames += 1;
    if (points > 0) userScore.correctGuesses += 1;
    
    const result = await this.updateUserScore(userScore, reddit, scheduler);
    console.log(`✅ Guesser points awarded. New totals - All-time: ${userScore.guesserPoints}, Weekly: ${userScore.weeklyGuesserPoints}`);
    
    // UPDATED: Only update flair if level changed (weekly rank updates happen hourly)
    if (result.leveledUp && reddit) {
      const gameSettings = await this.getGameSettings();
      if (gameSettings.subredditName) {
        await this.updateFlairOnLevelUp(username, gameSettings.subredditName, reddit);
      }
    }
    
    return result;
  }

  // FIXED: Ensure liar points are properly awarded and tracked
  async awardLiarPoints(userId: string, username: string, points: number, reddit?: any, scheduler?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    console.log(`🎭 Awarding ${points} liar points to ${username} (${userId})`);
    
    const userScore = await this.getUserScore(userId);
    const oldLevel = userScore.level;
    userScore.username = username;
    userScore.liarPoints += points;
    userScore.weeklyLiarPoints += points;
    
    const result = await this.updateUserScore(userScore, reddit, scheduler);
    console.log(`✅ Liar points awarded. New totals - All-time: ${userScore.liarPoints}, Weekly: ${userScore.weeklyLiarPoints}`);
    
    // UPDATED: Only update flair if level changed
    if (result.leveledUp && reddit) {
      const gameSettings = await this.getGameSettings();
      if (gameSettings.subredditName) {
        await this.updateFlairOnLevelUp(username, gameSettings.subredditName, reddit);
      }
    }
    
    return result;
  }

  // Debug method to check leaderboard state
  async debugLeaderboards(): Promise<void> {
    const weekNumber = this.getWeekNumber();
    const keys = [
      'leaderboard:guesser:alltime',
      'leaderboard:liar:alltime',
      `leaderboard:guesser:weekly:${weekNumber}`,
      `leaderboard:liar:weekly:${weekNumber}`,
    ];

    for (const key of keys) {
      const count = await this.redis.zCard(key);
      const top3 = await this.redis.zRange(key, 0, 2, { withScores: true, reverse: true });
      console.log(`Leaderboard ${key}: ${count} entries, top 3:`, top3);
    }
  }
}