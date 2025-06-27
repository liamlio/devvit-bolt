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
      level: 1,
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

    await this.updateLeaderboards(userScore);

    const leveledUp = newLevel.level > oldLevel;
    return {
      leveledUp,
      newLevel: leveledUp ? newLevel.level : undefined,
    };
  }

  private async updateLeaderboards(userScore: UserScore): Promise<void> {
    const weekNumber = this.getWeekNumber();
    
    await this.redis.zadd(`leaderboard:guesser:weekly:${weekNumber}`, {
      member: userScore.userId,
      score: userScore.weeklyGuesserPoints,
    });
    await this.redis.zadd('leaderboard:guesser:alltime', {
      member: userScore.userId,
      score: userScore.guesserPoints,
    });

    await this.redis.zadd(`leaderboard:liar:weekly:${weekNumber}`, {
      member: userScore.userId,
      score: userScore.weeklyLiarPoints,
    });
    await this.redis.zadd('leaderboard:liar:alltime', {
      member: userScore.userId,
      score: userScore.liarPoints,
    });
  }

  async getLeaderboard(type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime', limit: number = 10): Promise<LeaderboardEntry[]> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    const results = await this.redis.zRange(key, 0, limit - 1, { withScores: true });
    results.reverse();
    
    const leaderboard: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i++) {
      const { member: userId, score } = results[i];
      const userScore = await this.getUserScore(userId);
      leaderboard.push({
        userId,
        username: userScore.username,
        score,
        rank: i + 1,
      });
    }

    return leaderboard;
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

  // Utility Methods
  private getWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }

  getLevelByExperience(experience: number): { level: number; name: string } {
    const levels = [
      { level: 1, name: 'Rookie Detective', experienceRequired: 1 },
      { level: 2, name: 'Truth Seeker', experienceRequired: 10 },
      { level: 3, name: 'Lie Detector', experienceRequired: 20 },
      { level: 4, name: 'Master Sleuth', experienceRequired: 35 },
      { level: 5, name: 'Truth Master', experienceRequired: 55 },
      { level: 6, name: 'Carnival Legend', experienceRequired: 80 },
      { level: 7, name: 'Ultimate Detective', experienceRequired: 110 },
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (experience >= levels[i].experienceRequired) {
        return levels[i];
      }
    }
    return levels[0];
  }

  async awardExperience(userId: string, username: string, points: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const userScore = await this.getUserScore(userId);
    userScore.username = username;
    userScore.experience += points;
    
    return await this.updateUserScore(userScore);
  }

  async awardGuesserPoints(userId: string, username: string, points: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const userScore = await this.getUserScore(userId);
    userScore.username = username;
    userScore.guesserPoints += points;
    userScore.weeklyGuesserPoints += points;
    userScore.totalGames += 1;
    if (points > 0) userScore.correctGuesses += 1;
    
    return await this.updateUserScore(userScore);
  }

  async awardLiarPoints(userId: string, username: string, points: number): Promise<{ leveledUp: boolean; newLevel?: number }> {
    const userScore = await this.getUserScore(userId);
    userScore.username = username;
    userScore.liarPoints += points;
    userScore.weeklyLiarPoints += points;
    
    return await this.updateUserScore(userScore);
  }
}