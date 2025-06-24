import { RedisClient } from '@devvit/redis';
import type { GamePost, UserGuess, UserScore, LeaderboardEntry, GameSettings } from '../../shared/types/game';
import { getLevelByExperience } from './levels';

export class GameService {
  constructor(private redis: RedisClient) {}

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

  async hasUserGuessed(postId: string, userId: string): Promise<boolean> {
    const guess = await this.getUserGuess(postId, userId);
    return guess !== null;
  }

  // User Score Management
  async getUserScore(userId: string): Promise<UserScore> {
    const key = `user_score:${userId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    // Return default score for new users
    return {
      userId,
      username: '', // Will be set when first used
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
    const newLevelData = getLevelByExperience(userScore.experience);
    userScore.level = newLevelData.level;
    
    const key = `user_score:${userScore.userId}`;
    await this.redis.set(key, JSON.stringify(userScore));

    // Update leaderboards
    await this.updateLeaderboards(userScore);

    const leveledUp = newLevelData.level > oldLevel;
    return {
      leveledUp,
      newLevel: leveledUp ? newLevelData.level : undefined,
    };
  }

  private async updateLeaderboards(userScore: UserScore): Promise<void> {
    const weekNumber = this.getWeekNumber();
    
    // Update guesser leaderboards
    await this.redis.zadd(`leaderboard:guesser:weekly:${weekNumber}`, {
      member: userScore.userId,
      score: userScore.weeklyGuesserPoints,
    });
    await this.redis.zadd('leaderboard:guesser:alltime', {
      member: userScore.userId,
      score: userScore.guesserPoints,
    });

    // Update liar leaderboards
    await this.redis.zadd(`leaderboard:liar:weekly:${weekNumber}`, {
      member: userScore.userId,
      score: userScore.weeklyLiarPoints,
    });
    await this.redis.zadd('leaderboard:liar:alltime', {
      member: userScore.userId,
      score: userScore.liarPoints,
    });
  }

  // Leaderboard Management
  async getLeaderboard(type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime', limit: number = 10): Promise<LeaderboardEntry[]> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    const results = await this.redis.zRange(key, 0, limit - 1, { reverse: true, withScores: true });
    
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

  async getUserRank(userId: string, type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime'): Promise<number> {
    const weekNumber = this.getWeekNumber();
    const key = timeframe === 'weekly' 
      ? `leaderboard:${type}:weekly:${weekNumber}`
      : `leaderboard:${type}:alltime`;

    const rank = await this.redis.zRevRank(key, userId);
    return rank !== null ? rank + 1 : -1;
  }

  // Game Settings
  async getGameSettings(): Promise<GameSettings> {
    const data = await this.redis.get('game_settings');
    return data ? JSON.parse(data) : { subredditName: '' };
  }

  async setGameSettings(settings: GameSettings): Promise<void> {
    await this.redis.set('game_settings', JSON.stringify(settings));
  }

  // Pinned Post Management
  async setPinnedPost(postId: string): Promise<void> {
    await this.redis.set('pinned_post', postId);
  }

  async getPinnedPost(): Promise<string | null> {
    return await this.redis.get('pinned_post');
  }

  // Post Type Management
  async setPostType(postId: string, type: 'game' | 'pinned'): Promise<void> {
    await this.redis.set(`post_type:${postId}`, type);
  }

  async getPostType(postId: string): Promise<'game' | 'pinned' | null> {
    const type = await this.redis.get(`post_type:${postId}`);
    return type as 'game' | 'pinned' | null;
  }

  // Utility Methods
  private getWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }

  // Experience and Level Management
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