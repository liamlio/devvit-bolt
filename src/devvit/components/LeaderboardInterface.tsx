import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
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
              
              <hstack gap="large">
                <vstack>
                  <text size="xsmall" color={CarnivalTheme.colors.text}>
                    Level {userStats.level}
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.text}>
                    {userStats.experience} XP
                  </text>
                </vstack>
                <vstack>
                  <text size="xsmall" color={CarnivalTheme.colors.text}>
                    Games: {userStats.totalGames}
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.text}>
                    Accuracy: {userStats.totalGames > 0 
                      ? Math.round((userStats.correctGuesses / userStats.totalGames) * 100) 
                      : 0}%
                  </text>
                </vstack>
              </hstack>
              
              <hstack gap="medium" alignment="middle">
                <text size="xsmall" color={CarnivalTheme.colors.text}>
                  Weekly: #{userWeeklyGuesserRank || 'N/A'} guesser, #{userWeeklyLiarRank || 'N/A'} liar
                </text>
                <text size="xsmall" color={CarnivalTheme.colors.textLight}>•</text>
                <text size="xsmall" color={CarnivalTheme.colors.text}>
                  All-Time: #{userAllTimeGuesserRank || 'N/A'} guesser, #{userAllTimeLiarRank || 'N/A'} liar
                </text>
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