import { Devvit, Context, useAsync, useState } from '@devvit/public-api';
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
  // NEW: Optional back button functionality
  onBack?: () => void;
  showBackButton?: boolean;
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
  onViewFullLeaderboard,
  onBack,
  showBackButton = false
}: LeaderboardInterfaceProps): JSX.Element => {
  const { reddit, ui } = context;
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  // NEW: State for toggling between guesser and liar leaderboards on small screens
  const [activeLeaderboard, setActiveLeaderboard] = useState<'guessers' | 'liars'>('guessers');

  // NEW: Handle subscribe action using the correct API
  const handleSubscribe = async () => {
    if (!reddit) return;
    
    try {
      await reddit.subscribeToCurrentSubreddit();
      ui.showToast('🎪 Subscribed to the community! Welcome aboard!');
    } catch (error) {
      console.error('Error subscribing to subreddit:', error);
      ui.showToast('Error subscribing to community. Please try again.');
    }
  };

  // NEW: Handle logo click to navigate to Bolt.new
  const handleLogoClick = () => {
    ui.navigateTo('https://bolt.new/');
  };

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
    
    // Get all levels to find the next one (now 9 levels: 0-8)
    const levels = [
      { level: 0, name: 'Huge Clown', experienceRequired: 0 },
      { level: 1, name: 'Clown', experienceRequired: 1 },
      { level: 2, name: 'Rookie Detective', experienceRequired: 20 },
      { level: 3, name: 'Truth Seeker', experienceRequired: 40 },
      { level: 4, name: 'Lie Detector', experienceRequired: 70 },
      { level: 5, name: 'Master Sleuth', experienceRequired: 110 },
      { level: 6, name: 'Truth Master', experienceRequired: 160 },
      { level: 7, name: 'Ultimate Detective', experienceRequired: 220 },
      { level: 8, name: 'Carnival Legend', experienceRequired: 300 },
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
      <vstack width="100%" height="100%" padding="medium" gap="xsmall" overflow="scroll">
        <CarnivalCard padding="medium" gap="small" width="100%">
          {/* FIXED: Header with logo positioned within the card */}
          {isSmallScreen ? (
            /* Small screen: Stack title and back button vertically */
            <vstack gap="xxsmall" alignment="center">
              {/* Title with logo on the right */}
              <hstack width="100%" alignment="middle">
                <vstack gap="xsmall" alignment="center" grow>
                  <text size="large" alignment="center" color={CarnivalTheme.colors.text}>
                    🏆 Two Truths One Lie
                  </text>
                  <text size="xsmall" alignment="center" color={CarnivalTheme.colors.textLight}>
                    Welcome to the carnival of deception! Can you spot the lies?
                  </text>
                </vstack>
                
                {/* Logo positioned at the right within the card */}
                <image
                  url="white_circle_360x360.png"
                  imageHeight={32}
                  imageWidth={32}
                  height="32px"
                  width="32px"
                  description="Bolt.new logo - Click to visit bolt.new"
                  onPress={handleLogoClick}
                />
              </hstack>
              
              {/* Back button row if needed */}
              {showBackButton && onBack && (
                <hstack width="100%" alignment="start">
                  <button
                    appearance="secondary"
                    onPress={onBack}
                    size="small"
                  >
                    ← Back
                  </button>
                </hstack>
              )}
            </vstack>
          ) : (
            /* Large screen: Horizontal layout with logo */
            <vstack gap="xsmall" alignment="center">
              {/* Title with logo on the right */}
              <hstack width="100%" alignment="middle">
                {/* Left side: Back button or spacer */}
                {showBackButton && onBack ? (
                  <button
                    appearance="secondary"
                    onPress={onBack}
                    size="small"
                  >
                    ← Back
                  </button>
                ) : (
                  <spacer width="60px" />
                )}
                
                {/* Center: Title */}
                <vstack gap="xsmall" alignment="center" grow>
                  <text size="large" alignment="center" color={CarnivalTheme.colors.text}>
                    🏆 Two Truths One Lie
                  </text>
                  <text size="xsmall" alignment="center" color={CarnivalTheme.colors.textLight}>
                    Welcome to the carnival of deception! Can you spot the lies?
                  </text>
                </vstack>
                
                {/* Right side: Logo */}
                <image
                  url="white_circle_360x360.png"
                  imageHeight={48}
                  imageWidth={48}
                  height="48px"
                  width="48px"
                  description="Bolt.new logo - Click to visit bolt.new"
                  onPress={handleLogoClick}
                />
              </hstack>
            </vstack>
          )}

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
                      {/* UPDATED: Display current level with title using proper Devvit components */}
                      <hstack gap="xsmall" alignment="middle">
                        <text size="xsmall" color={CarnivalTheme.colors.text}>
                          🎯 Lvl.{userStats.level}: 
                        </text>
                        <text size="xsmall" color={CarnivalTheme.colors.primary} weight="bold">
                          {(() => {
                            const gameService = new GameService(context.redis);
                            const levelInfo = gameService.getLevelByExperience(userStats.experience);
                            return levelInfo.name;
                          })()}
                        </text>
                      </hstack>
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
                            You've achieved the highest rank: Carnival Legend!
                          </text>
                        </vstack>
                      );
                    }

                    return (
                      <vstack gap="xsmall">
                        <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text}>
                          🎯 Next Level
                        </text>
                        
                        {/* UPDATED: Display next level with title using proper Devvit components */}
                        <hstack gap="xsmall" alignment="middle">
                          <text size="xsmall" color={CarnivalTheme.colors.text}>
                            Lvl.{nextLevelInfo.nextLevel?.level}: 
                          </text>
                          <text size="xsmall" color={CarnivalTheme.colors.primary} weight="bold">
                             {nextLevelInfo.nextLevel?.name}
                          </text>
                        </hstack>
                        
                        {/* UPDATED: Progress display for small screens */}
                        <vstack gap="xxsmall">
                          {isSmallScreen ? (
                            // Small screen: Show current/required XP instead of 0% progress bar
                            <text size="xsmall" color={CarnivalTheme.colors.text}>
                              {userStats.experience}/{nextLevelInfo.nextLevel?.experienceRequired} XP
                            </text>
                          ) : (
                            // Large screen: Show progress bar
                            <>
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
                            </>
                          )}
                        </vstack>
                        
                        {/* UPDATED: Remove "X XP to go" text for small screens */}
                        {!isSmallScreen && (
                          <text size="xsmall" color={CarnivalTheme.colors.text}>
                            {nextLevelInfo.experienceNeeded} XP to go
                          </text>
                        )}
                        
                        <vstack gap="xxsmall">
                          <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                            💡 Earn XP by:
                          </text>
                          {/* UPDATED: Remove XP values for small screens */}
                          {isSmallScreen ? (
                            <vstack gap="xxsmall">
                              <text size="xsmall" color={CarnivalTheme.colors.text}>
                                • Playing games
                              </text>
                              <text size="xsmall" color={CarnivalTheme.colors.text}>
                                • Correct guesses
                              </text>
                              <text size="xsmall" color={CarnivalTheme.colors.text}>
                                • Posts with 5+ guesses
                              </text>
                            </vstack>
                          ) : (
                            <vstack gap="xxsmall">
                              <text size="xsmall" color={CarnivalTheme.colors.text}>
                                • Playing games (+1 XP)
                              </text>
                              <text size="xsmall" color={CarnivalTheme.colors.text}>
                                • Correct guesses (+2 XP)
                              </text>
                              <text size="xsmall" color={CarnivalTheme.colors.text}>
                                • Posts with 5+ guesses (+10 XP)
                              </text>
                            </vstack>
                          )}
                        </vstack>
                      </vstack>
                    );
                  })()}
                </vstack>
              </hstack>
            </vstack>
          )}

          {/* UPDATED: Top 3 Leaderboards Preview with toggle for small screens */}
          {isSmallScreen ? (
            /* Small screen: Toggle between guesser and liar leaderboards */
            <vstack gap="small">
              {/* Toggle buttons */}
              <hstack gap="small">
                <button
                  appearance={activeLeaderboard === 'guessers' ? 'primary' : 'secondary'}
                  onPress={() => setActiveLeaderboard('guessers')}
                  grow
                  size="small"
                >
                  🕵️ Top Guessers
                </button>
                <button
                  appearance={activeLeaderboard === 'liars' ? 'primary' : 'secondary'}
                  onPress={() => setActiveLeaderboard('liars')}
                  grow
                  size="small"
                >
                  🎭 Top Liars
                </button>
              </hstack>

              {/* Single leaderboard display */}
              <vstack 
                padding="small"
                backgroundColor={CarnivalTheme.colors.background} 
                cornerRadius="medium"
                border="thin"
                borderColor={CarnivalTheme.colors.shadow}
                gap="small"
              >
                <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                  {activeLeaderboard === 'guessers' ? '🕵️ Top Guessers (Weekly)' : '🎭 Top Liars (Weekly)'}
                </text>
                {renderTopThree(activeLeaderboard === 'guessers' ? topGuessers : topLiars, activeLeaderboard === 'guessers' ? 'guesser' : 'liar')}
              </vstack>
            </vstack>
          ) : (
            /* Large screen: Side-by-side leaderboards */
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
          )}

          {/* UPDATED: Bottom buttons wrapped in vstack with small gap */}
          <vstack gap="small">
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

            {/* UPDATED: Subscribe button now red with white text */}
            <hstack
              backgroundColor="#FF4444"
              cornerRadius="medium"
              padding="small"
              onPress={handleSubscribe}
              width="100%"
              alignment="center middle"
            >
              <text color="white" weight="bold" size="small">
                Subscribe
              </text>
            </hstack>
          </vstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};