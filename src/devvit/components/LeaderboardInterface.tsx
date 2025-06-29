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
  activeTab: 'guessers' | 'liars';
  onTabChange: (tab: 'guessers' | 'liars') => void;
  onCreateGame: () => void;
}

export const LeaderboardInterface = ({ 
  context,
  guesserLeaderboard, 
  liarLeaderboard, 
  userStats, 
  activeTab, 
  onTabChange, 
  onCreateGame 
}: LeaderboardInterfaceProps): JSX.Element => {
  const currentLeaderboard = activeTab === 'guessers' ? guesserLeaderboard : liarLeaderboard;
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

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
            </vstack>
          )}

          {/* Tab Navigation */}
          <hstack gap="small">
            <button
              appearance={activeTab === 'guessers' ? 'primary' : 'secondary'}
              onPress={() => onTabChange('guessers')}
              grow
              size="small"
            >
              🕵️ Best Guessers
            </button>
            <button
              appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
              onPress={() => onTabChange('liars')}
              grow
              size="small"
            >
              🎭 Best Liars
            </button>
          </hstack>

          {/* Single Block Leaderboard */}
          <vstack 
            padding="small"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.shadow}
            maxHeight="400px"
            overflow="scroll"
            gap="none"
          >
            {currentLeaderboard.length > 0 ? (
              currentLeaderboard.map((entry, index) => {
                const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                const scoreText = activeTab === 'guessers' 
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
              })
            ) : (
              <vstack alignment="center middle" padding="medium">
                <text size="medium" color={CarnivalTheme.colors.text}>🎪</text>
                <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                  No entries yet! Be the first to play!
                </text>
              </vstack>
            )}
          </vstack>

          {/* Action Button */}
          <button
            appearance="primary"
            onPress={onCreateGame}
            width="100%"
            size="small"
          >
            Create Your Game 🎪
          </button>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};