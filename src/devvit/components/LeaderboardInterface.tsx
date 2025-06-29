import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import { GameService } from '../service/GameService.js';
import type { LeaderboardEntry, UserScore } from '../../shared/types/game.js';

interface LeaderboardInterfaceProps {
  context: Context;
  guesserLeaderboard: LeaderboardEntry[];
  liarLeaderboard: LeaderboardEntry[];
  userStats?: UserScore;
  userWeeklyGuesserRank?: number;
  userWeeklyLiarRank?: number;
  userAllTimeGuesserRank?: number;
  userAllTimeLiarRank?: number;
  onCreateGame: () => void;
  onViewFullLeaderboard: () => void;
}

export const LeaderboardInterface = ({ 
  context,
  guesserLeaderboard, 
  liarLeaderboard, 
  userStats, 
  userWeeklyGuesserRank,
  userWeeklyLiarRank,
  userAllTimeGuesserRank,
  userAllTimeLiarRank,
  onCreateGame,
  onViewFullLeaderboard
}: LeaderboardInterfaceProps): JSX.Element => {
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  // Show only top 3 for preview
  const topGuessers = guesserLeaderboard.slice(0, 3);
  const topLiars = liarLeaderboard.slice(0, 3);

  const formatRank = (rank: number | undefined | null): string => {
    if (!rank) return 'N/A';
    if (rank === 1) return '🥇 1st';
    if (rank === 2) return '🥈 2nd';
    if (rank === 3) return '🥉 3rd';
    return `#${rank}`;
  };

  const renderTopThree = (entries: LeaderboardEntry[], type: 'guesser' | 'liar') => {
    if (entries.length === 0) {
      return (
        <text size="xsmall" color={CarnivalTheme.colors.textLight} alignment="center">
          No entries yet!
        </text>
      );
    }

    return (
      <vstack gap="xxsmall">
        {entries.map((entry, index) => {
          const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          const scoreText = type === 'guesser' 
            ? `${entry.score} correct`
            : `${entry.score} fooled`;
          
          return (
            <text 
              key={entry.userId}
              size="xsmall" 
              color={CarnivalTheme.colors.text}
            >
              {rank} u/{entry.username} - {scoreText}
            </text>
          );
        })}
      </vstack>
    );
  };

  // Calculate next level progress
  const getNextLevelInfo = (userStats: UserScore) => {
    const gameService = new GameService(context.redis);
    const currentLevel = gameService.getLevelByExperience(userStats.experience);
    
    // Get all levels to find the next one
    const levels = [
      { level: 0, name: 'Clown', experienceRequired: 0 },
      { level: 1, name: 'Rookie Detective', experienceRequired: 1 },
      { level: 2, name: 'Truth Seeker', experienceRequired: 10 },
      { level: 3, name: 'Lie Detector', experienceRequired: 20 },
      { level: 4, name: 'Master Sleuth', experienceRequired: 35 },
      { level: 5, name: 'Truth Master', experienceRequired: 55 },
      { level: 6, name: 'Carnival Legend', experienceRequired: 80 },
      { level: 7, name: 'Ultimate Detective', experienceRequired: 110 },
    ];

    const nextLevelIndex = levels.findIndex(l => l.level === currentLevel.level + 1);
    
    if (nextLevelIndex === -1) {
      // Max level reached
      return {
        isMaxLevel: true,
        nextLevel: null,
        experienceNeeded: 0,
        progressPercentage: 100,
      };
    }

    const nextLevel = levels[nextLevelIndex];
    const currentLevelExp = levels[currentLevel.level]?.experienceRequired || 0;
    const experienceNeeded = nextLevel.experienceRequired - userStats.experience;
    const experienceInCurrentLevel = userStats.experience - currentLevelExp;
    const experienceRequiredForCurrentLevel = nextLevel.experienceRequired - currentLevelExp;
    const progressPercentage = Math.round((experienceInCurrentLevel / experienceRequiredForCurrentLevel) * 100);

    return {
      isMaxLevel: false,
      nextLevel,
      experienceNeeded,
      progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
    };
  };

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding="medium" gap="small" overflow="scroll">
        <CarnivalCard padding="medium">
          <text size="large" alignment="center" color={CarnivalTheme.colors.text}>🏆 Two Truths One Lie</text>
          <text size="xsmall" alignment="center" color={CarnivalTheme.colors.textLight}>
            Welcome to the carnival of deception! Can you spot the lies?
          </text>

          {/* User Stats */}
          {userStats && (
            <vstack 
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium" 
              border="thin" 
              borderColor={CarnivalTheme.colors.primary}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text}>Your Stats</text>
              
              {/* Main stats section with vertical divider */}
              <hstack gap="small" alignment="top">
                {/* Left side - Current stats */}
                <vstack gap="small" grow>
                  <hstack gap="large">
                    <vstack>
                      <text size="xsmall" color={CarnivalTheme.colors.text}>
                        🎯 Level {userStats.level}
                      </text>
                      <text size="xsmall" color={CarnivalTheme.colors.text}>
                        ⭐ {userStats.experience} XP
                      </text>
                    </vstack>
                    <vstack>
                      <text size="xsmall" color={CarnivalTheme.colors.text}>
                        🎮 Games: {userStats.totalGames}
                      </text>
                      <text size="xsmall" color={CarnivalTheme.colors.text}>
                        🎯 Accuracy: {userStats.totalGames > 0 
                          ? Math.round((userStats.correctGuesses / userStats.totalGames) * 100) 
                          : 0}%
                      </text>
                    </vstack>
                  </hstack>
                  
                  {/* Leaderboard Positions Section */}
                  <vstack gap="xsmall">
                    <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text}>
                      Leaderboard Positions
                    </text>
                    
                    <hstack gap="medium">
                      <vstack gap="xxsmall">
                        <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                          📅 This Week
                        </text>
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          🕵️ {formatRank(userWeeklyGuesserRank)} guesser
                        </text>
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          🎭 {formatRank(userWeeklyLiarRank)} liar
                        </text>
                      </vstack>
                      
                      <vstack gap="xxsmall">
                        <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                          🏆 All-Time
                        </text>
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          🕵️ {formatRank(userAllTimeGuesserRank)} guesser
                        </text>
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          🎭 {formatRank(userAllTimeLiarRank)} liar
                        </text>
                      </vstack>
                    </hstack>
                  </vstack>
                </vstack>

                {/* Vertical divider - bluish bar that doesn't quite touch borders */}
                <vstack height="100%" width="2px" alignment="center middle">
                  <spacer height="4px" />
                  <vstack grow width="2px" backgroundColor={CarnivalTheme.colors.primary} />
                  <spacer height="4px" />
                </vstack>

                {/* Right side - Next level progress */}
                <vstack gap="xsmall" grow>
                  {(() => {
                    const nextLevelInfo = getNextLevelInfo(userStats);
                    
                    if (nextLevelInfo.isMaxLevel) {
                      return (
                        <vstack gap="xsmall" alignment="center">
                          <text size="xsmall" weight="bold" color={CarnivalTheme.colors.accent}>
                            🏆 Max Level Reached!
                          </text>
                          <text size="xsmall" color={CarnivalTheme.colors.text} alignment="center">
                            You've achieved the highest rank: Ultimate Detective!
                          </text>
                        </vstack>
                      );
                    }

                    return (
                      <vstack gap="xsmall">
                        <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text}>
                          🎯 Next Level
                        </text>
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          {nextLevelInfo.nextLevel?.name}
                        </text>
                        
                        {/* Progress bar */}
                        <vstack gap="xxsmall">
                          <hstack 
                            width="100%" 
                            height="6px" 
                            backgroundColor="rgba(0,0,0,0.1)" 
                            cornerRadius="small"
                          >
                            <hstack 
                              width={`${nextLevelInfo.progressPercentage}%`} 
                              height="100%" 
                              backgroundColor={CarnivalTheme.colors.accent}
                              cornerRadius="small"
                            />
                          </hstack>
                          <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                            {nextLevelInfo.progressPercentage}% complete
                          </text>
                        </vstack>
                        
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          🎯 Need {nextLevelInfo.experienceNeeded} more XP
                        </text>
                        
                        <vstack gap="xxsmall">
                          <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                            💡 Earn XP by:
                          </text>
                          <text size="xsmall" color={CarnivalTheme.colors.text}>
                            • Playing games (+1 XP)
                          </text>
                          <text size="xsmall" color={CarnivalTheme.colors.text}>
                            • Correct guesses (+4 XP)
                          </text>
                        </vstack>
                      </vstack>
                    );
                  })()}
                </vstack>
              </hstack>
            </vstack>
          )}

          {/* Top 3 Leaderboards Preview */}
          <hstack gap="small">
            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.shadow}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                🕵️ Top Guessers (Weekly)
              </text>
              {renderTopThree(topGuessers, 'guesser')}
            </vstack>

            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.shadow}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                🎭 Top Liars (Weekly)
              </text>
              {renderTopThree(topLiars, 'liar')}
            </vstack>
          </hstack>

          {/* View Full Leaderboard Button */}
          <button
            appearance="secondary"
            onPress={onViewFullLeaderboard}
            width="100%"
            size="small"
          >
            View Leaderboard 🏆
          </button>

          {/* Create Game Button */}
          <button
            appearance="primary"
            onPress={onCreateGame}
            width="100%"
            size="small"
          >
            Create a Game 🎪
          </button>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};