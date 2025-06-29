import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { LeaderboardEntry } from '../../shared/types/game.js';

interface FullLeaderboardInterfaceProps {
  context: Context;
  weeklyGuesserLeaderboard: LeaderboardEntry[];
  allTimeGuesserLeaderboard: LeaderboardEntry[];
  weeklyLiarLeaderboard: LeaderboardEntry[];
  allTimeLiarLeaderboard: LeaderboardEntry[];
  activeTab: 'guessers' | 'liars';
  onTabChange: (tab: 'guessers' | 'liars') => void;
  onBack: () => void;
}

export const FullLeaderboardInterface = ({ 
  context,
  weeklyGuesserLeaderboard,
  allTimeGuesserLeaderboard,
  weeklyLiarLeaderboard,
  allTimeLiarLeaderboard,
  activeTab, 
  onTabChange, 
  onBack 
}: FullLeaderboardInterfaceProps): JSX.Element => {
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  const currentWeeklyLeaderboard = activeTab === 'guessers' ? weeklyGuesserLeaderboard : weeklyLiarLeaderboard;
  const currentAllTimeLeaderboard = activeTab === 'guessers' ? allTimeGuesserLeaderboard : allTimeLiarLeaderboard;

  const renderLeaderboard = (entries: LeaderboardEntry[], type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime') => {
    if (entries.length === 0) {
      return (
        <vstack alignment="center middle" padding="medium">
          <text size="medium" color={CarnivalTheme.colors.text}>🎪</text>
          <text size="xsmall" color={CarnivalTheme.colors.textLight}>
            No entries yet!
          </text>
        </vstack>
      );
    }

    return (
      <vstack gap="xxsmall" maxHeight="400px" overflow="scroll">
        {entries.map((entry, index) => {
          const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
          const scoreText = type === 'guesser' 
            ? `${entry.score} correct`
            : `${entry.score} fooled`;
          
          return (
            <text 
              key={`${timeframe}-${entry.userId}`}
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
          {/* Header with Back Button */}
          <hstack alignment="middle" gap="medium">
            <button
              appearance="secondary"
              onPress={onBack}
              size="small"
            >
              ← Back
            </button>
            <text size="large" weight="bold" color={CarnivalTheme.colors.text} grow alignment="center">
              🏆 Full Leaderboard
            </text>
            <spacer width="60px" /> {/* Balance the back button */}
          </hstack>

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

          {/* Side-by-Side Leaderboards */}
          <hstack gap="small" grow>
            {/* Weekly Leaderboard */}
            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.primary}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                📅 This Week
              </text>
              {renderLeaderboard(currentWeeklyLeaderboard, activeTab, 'weekly')}
            </vstack>

            {/* All-Time Leaderboard */}
            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.accent}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                🏆 All-Time
              </text>
              {renderLeaderboard(currentAllTimeLeaderboard, activeTab, 'alltime')}
            </vstack>
          </hstack>

          <text size="xsmall" alignment="center" color={CarnivalTheme.colors.textLight}>
            💡 Weekly leaderboards reset every Monday
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};