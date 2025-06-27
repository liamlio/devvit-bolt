import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { LeaderboardEntry, UserScore } from '../../shared/types/game.js';

interface LeaderboardInterfaceProps {
  guesserLeaderboard: LeaderboardEntry[];
  liarLeaderboard: LeaderboardEntry[];
  userStats?: UserScore;
  activeTab: 'guessers' | 'liars';
  onTabChange: (tab: 'guessers' | 'liars') => void;
  onCreateGame: () => void;
}

export const LeaderboardInterface = ({ 
  guesserLeaderboard, 
  liarLeaderboard, 
  userStats, 
  activeTab, 
  onTabChange, 
  onCreateGame 
}: LeaderboardInterfaceProps): JSX.Element => {
  const currentLeaderboard = activeTab === 'guessers' ? guesserLeaderboard : liarLeaderboard;

  return (
    <blocks height="tall">
      <CarnivalBackground>
        <vstack width="100%" height="100%" padding="large" gap="medium">
          <CarnivalCard>
            <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🏆 Two Truths One Lie</text>
            <text alignment="center" color={CarnivalTheme.colors.textLight}>
              Welcome to the carnival of deception! Can you spot the lies?
            </text>

            {/* User Stats */}
            {userStats && (
              <vstack 
                padding="medium" 
                backgroundColor={CarnivalTheme.colors.background} 
                cornerRadius="medium" 
                border="thin" 
                borderColor={CarnivalTheme.colors.primary}
              >
                <text weight="bold" color={CarnivalTheme.colors.text}>Your Stats</text>
                <hstack gap="large">
                  <vstack>
                    <text size="small" color={CarnivalTheme.colors.text}>
                      Level {userStats.level}
                    </text>
                    <text size="small" color={CarnivalTheme.colors.text}>
                      {userStats.experience} XP
                    </text>
                  </vstack>
                  <vstack>
                    <text size="small" color={CarnivalTheme.colors.text}>
                      Games: {userStats.totalGames}
                    </text>
                    <text size="small" color={CarnivalTheme.colors.text}>
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
              >
                <text color={activeTab === 'guessers' ? CarnivalTheme.colors.white : CarnivalTheme.colors.text} weight="bold">
                  🕵️ Best Guessers
                </text>
              </button>
              <button
                appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
                onPress={() => onTabChange('liars')}
              >
                <text color={activeTab === 'liars' ? CarnivalTheme.colors.white : CarnivalTheme.colors.text} weight="bold">
                  🎭 Best Liars
                </text>
              </button>
            </hstack>

            {/* Leaderboard */}
            <vstack gap="small">
              {currentLeaderboard.length > 0 ? (
                currentLeaderboard.map((entry, index) => (
                  <hstack 
                    key={entry.userId} 
                    padding="small" 
                    backgroundColor={CarnivalTheme.colors.background} 
                    cornerRadius="medium"
                    border="thin"
                    borderColor={CarnivalTheme.colors.shadow}
                  >
                    <text weight="bold" width="40px" color={CarnivalTheme.colors.text}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </text>
                    <text grow color={CarnivalTheme.colors.text}>u/{entry.username}</text>
                    <text weight="bold" color={CarnivalTheme.colors.text}>{entry.score}</text>
                  </hstack>
                ))
              ) : (
                <vstack alignment="center middle" padding="large">
                  <text size="large" color={CarnivalTheme.colors.text}>🎪</text>
                  <text color={CarnivalTheme.colors.textLight}>No entries yet! Be the first to play!</text>
                </vstack>
              )}
            </vstack>

            {/* Action Button */}
            <button
              appearance="primary"
              onPress={onCreateGame}
            >
              <text color={CarnivalTheme.colors.white} weight="bold">Create Your Game 🎪</text>
            </button>
          </CarnivalCard>
        </vstack>
      </CarnivalBackground>
    </blocks>
  );
};