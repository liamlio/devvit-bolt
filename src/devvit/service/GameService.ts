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
      level: 0, // Start at level 0
      experience: 0,
      totalGames: 0,
      correctGuesses: 0,
    };
  }

  async updateUserScore(userScore: UserScore): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const oldLevel = userScore.level;
    const newLevel = this.getLevelByExperience(userScore.experience);
    userScore.level = newLevel.level;
    
    const key = `user_score:${userScore.userId}`;
    await this.redis.set(key, JSON.stringify(userScore));

    // CRITICAL: Update leaderboards immediately after updating user score
    await this.updateLeaderboards(userScore);

    const leveledUp = newLevel.level > oldLevel;
    return {
      leveledUp,
      newLevel: leveledUp ? newLevel.level : undefined,
    };
  }

  private async updateLeaderboards(userScore: UserScore): Promise<void> {
    const weekNumber = this.getWeekNumber();
    
    console.log(`Updating leaderboards for user ${userScore.username}:`, {
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

    console.log(`Successfully updated leaderboards for user ${userScore.username}`);
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
        
        // Only include users with actual scores > 0
        if (score > 0) {
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

  async getUserLeaderboardRank(userId: string, type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime'): Promise<number | null> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    console.log(`Getting user rank for ${userId} in ${key}`);

    try {
      // Get the user's ascending rank (0-based)
      const ascendingRank = await this.redis.zRank(key, userId);
      
      if (ascendingRank === null || ascendingRank === undefined) {
        console.log(`User ${userId} not found in leaderboard ${key}`);
        return null;
      }
      
      // Get total number of members in the sorted set
      const totalMembers = await this.redis.zCard(key);
      
      // Calculate descending rank: total members - ascending rank (0-based) = descending rank (1-based)
      const userRank = totalMembers - ascendingRank;
      console.log(`User ${userId} rank in ${key}: ${userRank} (ascending rank: ${ascendingRank}, total: ${totalMembers})`);
      
      return userRank;
    } catch (error) {
      console.error(`Error getting user leaderboard rank for ${key}:`, error);
      return null;
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

  // User Flair Management
  async updateUserFlair(username: string, subredditName: string, reddit: any): Promise<void> {
    try {
      // Get user's current level and stats
      const userScore = await this.getUserScore(`user_${username}`); // Assuming userId format
      const levelInfo = this.getLevelByExperience(userScore.experience);
      
      // Get user's weekly guesser rank
      const weeklyGuesserRank = await this.getUserLeaderboardRank(`user_${username}`, 'guesser', 'weekly');
      
      // Format the complex flair text: "{level title} | {current EXP} | Weekly guesser rank"
      const rankText = weeklyGuesserRank ? `#${weeklyGuesserRank}` : 'Unranked';
      const flairText = `${levelInfo.name} | ${userScore.experience} XP | ${rankText}`;
      
      // Set user flair with complex information and carnival-themed color
      await reddit.setUserFlair({
        subredditName,
        username,
        text: flairText,
        backgroundColor: this.getLevelFlairColor(levelInfo.level),
        textColor: 'dark', // Use dark text for better readability
      });
      
      console.log(`Updated complex flair for ${username}: "${flairText}" (Level ${levelInfo.level})`);
    } catch (error) {
      console.error(`Error updating flair for ${username}:`, error);
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
      '#FF4500', // Level 7 - Orange Red (Carnival Legend)
      '#8A2BE2', // Level 8 - Blue Violet (Ultimate Detective)
    ];
    
    return carnivalColors[Math.min(level, carnivalColors.length - 1)] || carnivalColors[0];
  }

  // Utility Methods
  private getWeekNumber(): number {
    // Use a consistent week calculation based on Unix epoch
    const now = new Date();
    const epochStart = new Date('1970-01-01');
    const diffTime = now.getTime() - epochStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  }

  getLevelByExperience(experience: number): { level: number; name: string } {
    const levels = [
      { level: 0, name: 'Huge Clown', experienceRequired: 0 }, // Level 0 - Start here
      { level: 1, name: 'Clown', experienceRequired: 1 }, // Level 1 - Shifted from old level 0
      { level: 2, name: 'Rookie Detective', experienceRequired: 10 }, // Level 2 - Shifted from old level 1
      { level: 3, name: 'Truth Seeker', experienceRequired: 20 }, // Level 3 - Shifted from old level 2
      { level: 4, name: 'Lie Detector', experienceRequired: 35 }, // Level 4 - Shifted from old level 3
      { level: 5, name: 'Master Sleuth', experienceRequired: 55 }, // Level 5 - Shifted from old level 4
      { level: 6, name: 'Truth Master', experienceRequired: 80 }, // Level 6 - Shifted from old level 5
      { level: 7, name: 'Carnival Legend', experienceRequired: 110 }, // Level 7 - Shifted from old level 6
      { level: 8, name: 'Ultimate Detective', experienceRequired: 150 }, // Level 8 - Shifted from old level 7
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (experience >= levels[i].experienceRequired) {
        return levels[i];
      }
    }
    return levels[0]; // Return level 0 (Huge Clown) as default
  }

  async awardExperience(userId: string, username: string, points: number, reddit?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    console.log(`Awarding ${points} experience to ${username} (${userId})`);
    
    const userScore = await this.getUserScore(userId);
    const oldLevel = userScore.level;
    userScore.username = username;
    userScore.experience += points;
    
    const result = await this.updateUserScore(userScore);
    console.log(`Experience awarded. New total: ${userScore.experience}`);
    
    // Update flair if level changed and we have reddit API access
    if (result.leveledUp && reddit) {
      const gameSettings = await this.getGameSettings();
      if (gameSettings.subredditName) {
        await this.updateUserFlair(username, gameSettings.subredditName, reddit);
      }
    }
    
    return result;
  }

  async awardGuesserPoints(userId: string, username: string, points: number, reddit?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    console.log(`Awarding ${points} guesser points to ${username} (${userId})`);
    
    const userScore = await this.getUserScore(userId);
    const oldLevel = userScore.level;
    userScore.username = username;
    userScore.guesserPoints += points;
    userScore.weeklyGuesserPoints += points;
    userScore.totalGames += 1;
    if (points > 0) userScore.correctGuesses += 1;
    
    const result = await this.updateUserScore(userScore);
    console.log(`Guesser points awarded. New totals - All-time: ${userScore.guesserPoints}, Weekly: ${userScore.weeklyGuesserPoints}`);
    
    // Always update flair after awarding guesser points (since weekly rank may change)
    if (reddit) {
      const gameSettings = await this.getGameSettings();
      if (gameSettings.subredditName) {
        await this.updateUserFlair(username, gameSettings.subredditName, reddit);
      }
    }
    
    return result;
  }

  async awardLiarPoints(userId: string, username: string, points: number, reddit?: any): Promise<{ leveledUp: boolean; newLevel?: number }> {
    console.log(`Awarding ${points} liar points to ${username} (${userId})`);
    
    const userScore = await this.getUserScore(userId);
    const oldLevel = userScore.level;
    userScore.username = username;
    userScore.liarPoints += points;
    userScore.weeklyLiarPoints += points;
    
    const result = await this.updateUserScore(userScore);
    console.log(`Liar points awarded. New totals - All-time: ${userScore.liarPoints}, Weekly: ${userScore.weeklyLiarPoints}`);
    
    // Update flair if level changed and we have reddit API access
    if (result.leveledUp && reddit) {
      const gameSettings = await this.getGameSettings();
      if (gameSettings.subredditName) {
        await this.updateUserFlair(username, gameSettings.subredditName, reddit);
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