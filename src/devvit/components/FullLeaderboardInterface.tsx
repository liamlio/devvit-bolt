import { Devvit, Context, useAsync, useState } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import { GameService } from '../service/GameService.js';
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
  const { userId, redis } = context;
  const gameService = new GameService(redis);
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  // NEW: State for timeframe toggle on small screens
  const [activeTimeframe, setActiveTimeframe] = useState<'weekly' | 'alltime'>('weekly');

  // FIXED: Get user's leaderboard positions with enhanced debugging
  const { data: userPositions } = useAsync(async () => {
    if (!userId) return null;
    
    console.log(`🔍 FullLeaderboard: Getting user positions for ${userId} on activeTab: ${activeTab}`);
    
    const [weeklyGuesserRank, weeklyLiarRank, allTimeGuesserRank, allTimeLiarRank] = await Promise.all([
      gameService.getUserLeaderboardRank(userId, 'guesser', 'weekly'),
      gameService.getUserLeaderboardRank(userId, 'liar', 'weekly'),
      gameService.getUserLeaderboardRank(userId, 'guesser', 'alltime'),
      gameService.getUserLeaderboardRank(userId, 'liar', 'alltime'),
    ]);

    console.log(`📊 FullLeaderboard: User positions for ${userId}:`, {
      weeklyGuesserRank,
      weeklyLiarRank,
      allTimeGuesserRank,
      allTimeLiarRank,
    });

    return {
      weeklyGuesserRank,
      weeklyLiarRank,
      allTimeGuesserRank,
      allTimeLiarRank,
    };
  }, [userId, activeTab]);

  // Get current leaderboards based on active tab and timeframe
  const getCurrentLeaderboards = () => {
    if (isSmallScreen) {
      // Small screen: Show one leaderboard based on both tab and timeframe
      if (activeTab === 'guessers') {
        return {
          current: activeTimeframe === 'weekly' ? weeklyGuesserLeaderboard : allTimeGuesserLeaderboard,
          timeframe: activeTimeframe,
        };
      } else {
        return {
          current: activeTimeframe === 'weekly' ? weeklyLiarLeaderboard : allTimeLiarLeaderboard,
          timeframe: activeTimeframe,
        };
      }
    } else {
      // Large screen: Show both timeframes side by side
      return {
        weekly: activeTab === 'guessers' ? weeklyGuesserLeaderboard : weeklyLiarLeaderboard,
        alltime: activeTab === 'guessers' ? allTimeGuesserLeaderboard : allTimeLiarLeaderboard,
      };
    }
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], type: 'guesser' | 'liar', timeframe: 'weekly' | 'alltime') => {
    // Show only top 10
    const topEntries = entries.slice(0, 10);
    
    console.log(`🎯 FullLeaderboard: Rendering ${type} ${timeframe} leaderboard with ${topEntries.length} entries`);
    
    if (topEntries.length === 0) {
      return (
        <vstack alignment="center middle" padding="medium" grow>
          <text size="medium" color={CarnivalTheme.colors.text}>🎪</text>
          <text size="xsmall" color={CarnivalTheme.colors.textLight}>
            No entries yet!
          </text>
        </vstack>
      );
    }

    return (
      <vstack gap="xxsmall" grow>
        {/* Top 10 Players */}
        <vstack gap="xxsmall" maxHeight="300px" overflow="scroll">
          {topEntries.map((entry, index) => {
            const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
            
            // FIXED: Ensure correct scoreText based on the type parameter
            const scoreText = type === 'guesser' 
              ? `${entry.score} correct`
              : `${entry.score} fooled`;
            
            console.log(`📝 FullLeaderboard: Entry ${index + 1} for ${type}: u/${entry.username} - ${scoreText}`);
            
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

        <spacer grow />

        {/* FIXED: User's Position with enhanced debugging */}
        {userPositions && userId && (
          <vstack 
            padding="xsmall"
            backgroundColor="rgba(59, 130, 246, 0.1)"
            cornerRadius="small"
            border="thin"
            borderColor={CarnivalTheme.colors.primary}
          >
            <text size="xsmall" weight="bold" color={CarnivalTheme.colors.primary} alignment="center">
              Your Position
            </text>
            <text size="xsmall" color={CarnivalTheme.colors.text} alignment="center">
              {(() => {
                let rank: number | null = null;
                
                // FIXED: Get the correct rank based on current type and timeframe being displayed
                if (type === 'guesser') {
                  rank = timeframe === 'weekly' ? userPositions.weeklyGuesserRank : userPositions.allTimeGuesserRank;
                } else { // type === 'liar'
                  rank = timeframe === 'weekly' ? userPositions.weeklyLiarRank : userPositions.allTimeLiarRank;
                }
                
                console.log(`🏆 FullLeaderboard: Displaying rank for ${type} ${timeframe}: ${rank}`);
                
                return rank ? `#${rank}` : 'Not ranked yet';
              })()}
            </text>
          </vstack>
        )}
      </vstack>
    );
  };

  const leaderboards = getCurrentLeaderboards();

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
              onPress={() => {
                console.log(`🔄 FullLeaderboard: Switching to guessers tab`);
                onTabChange('guessers');
              }}
              grow
              size="small"
            >
              🕵️ Best Guessers
            </button>
            <button
              appearance={activeTab === 'liars' ? 'primary' : 'secondary'}
              onPress={() => {
                console.log(`🔄 FullLeaderboard: Switching to liars tab`);
                onTabChange('liars');
              }}
              grow
              size="small"
            >
              🎭 Best Liars
            </button>
          </hstack>

          {/* NEW: Timeframe toggle for small screens */}
          {isSmallScreen && (
            <hstack gap="small">
              <button
                appearance={activeTimeframe === 'weekly' ? 'primary' : 'secondary'}
                onPress={() => {
                  console.log(`🔄 FullLeaderboard: Switching to weekly timeframe`);
                  setActiveTimeframe('weekly');
                }}
                grow
                size="small"
              >
                📅 This Week
              </button>
              <button
                appearance={activeTimeframe === 'alltime' ? 'primary' : 'secondary'}
                onPress={() => {
                  console.log(`🔄 FullLeaderboard: Switching to alltime timeframe`);
                  setActiveTimeframe('alltime');
                }}
                grow
                size="small"
              >
                🏆 All-Time
              </button>
            </hstack>
          )}

          {/* Leaderboard Display */}
          {isSmallScreen ? (
            /* Small screen: Single leaderboard */
            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={activeTimeframe === 'weekly' ? CarnivalTheme.colors.primary : CarnivalTheme.colors.accent}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                {activeTimeframe === 'weekly' ? '📅 This Week' : '🏆 All-Time'}
              </text>
              {/* FIXED: Pass the correct type parameter */}
              {renderLeaderboard(leaderboards.current, activeTab === 'guessers' ? 'guesser' : 'liar', activeTimeframe)}
            </vstack>
          ) : (
            /* Large screen: Side-by-Side Leaderboards */
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
                {/* FIXED: Pass the correct type parameter */}
                {renderLeaderboard(leaderboards.weekly, activeTab === 'guessers' ? 'guesser' : 'liar', 'weekly')}
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
                {/* FIXED: Pass the correct type parameter */}
                {renderLeaderboard(leaderboards.alltime, activeTab === 'guessers' ? 'guesser' : 'liar', 'alltime')}
              </vstack>
            </hstack>
          )}

          <text size="xsmall" alignment="center" color={CarnivalTheme.colors.textLight}>
            💡 Weekly leaderboards reset every Monday
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};