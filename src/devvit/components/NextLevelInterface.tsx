import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import { GameService } from '../service/GameService.js';
import type { UserScore } from '../../shared/types/game.js';

interface NextLevelInterfaceProps {
  context: Context;
  userStats: UserScore;
  onBack: () => void;
}

export const NextLevelInterface = ({ 
  context,
  userStats, 
  onBack 
}: NextLevelInterfaceProps): JSX.Element => {
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  const gameService = new GameService(context.redis);
  const currentLevel = gameService.getLevelByExperience(userStats.experience);

  // Get all levels to find the next one
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
  
  const getNextLevelInfo = () => {
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

  const nextLevelInfo = getNextLevelInfo();

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding="medium" gap="small" overflow="scroll">
        <CarnivalCard padding="medium">
          {/* Header with Back Button - UPDATED: Smaller text sizes */}
          <hstack alignment="middle" gap="medium">
            <button
              appearance="secondary"
              onPress={onBack}
              size="small"
            >
              ← Back
            </button>
            <text size={isSmallScreen ? "medium" : "large"} weight="bold" color={CarnivalTheme.colors.text} grow alignment="center">
              🎯 Level Progress
            </text>
            <spacer width="60px" /> {/* Balance the back button */}
          </hstack>

          {/* Current Level Section - UPDATED: Smaller padding and text */}
          <vstack 
            padding={isSmallScreen ? "small" : "medium"}
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.primary}
            gap="small"
          >
            <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
              Current Level
            </text>
            
            <vstack gap="xsmall" alignment="center">
              <text size={isSmallScreen ? "large" : "xxlarge"} color={CarnivalTheme.colors.primary}>
                🎪
              </text>
              <text size={isSmallScreen ? "medium" : "large"} weight="bold" color={CarnivalTheme.colors.text}>
                Level {currentLevel.level}: {currentLevel.name}
              </text>
              <text size="small" color={CarnivalTheme.colors.text}>
                {userStats.experience} XP
              </text>
            </vstack>
          </vstack>

          {/* Next Level Section - UPDATED: Smaller padding and text */}
          {nextLevelInfo.isMaxLevel ? (
            <vstack 
              padding={isSmallScreen ? "small" : "medium"}
              backgroundColor="rgba(255, 215, 0, 0.1)" 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.accent}
              gap="small"
              alignment="center"
            >
              <text size={isSmallScreen ? "large" : "xxlarge"} color={CarnivalTheme.colors.accent}>
                🏆
              </text>
              <text size={isSmallScreen ? "medium" : "large"} weight="bold" color={CarnivalTheme.colors.accent} alignment="center">
                Maximum Level Reached!
              </text>
              <text size="small" color={CarnivalTheme.colors.text} alignment="center">
                You've achieved the highest rank: Carnival Legend!
              </text>
              <text size="xsmall" color={CarnivalTheme.colors.textLight} alignment="center">
                You are truly a master of the carnival of deception!
              </text>
            </vstack>
          ) : (
            <vstack 
              padding={isSmallScreen ? "small" : "medium"}
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.accent}
              gap="small"
            >
              <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                Next Level
              </text>
              
              <vstack gap="xsmall" alignment="center">
                <text size={isSmallScreen ? "medium" : "large"} weight="bold" color={CarnivalTheme.colors.accent}>
                  Level {nextLevelInfo.nextLevel?.level}: {nextLevelInfo.nextLevel?.name}
                </text>
                <text size="small" color={CarnivalTheme.colors.text}>
                  Requires {nextLevelInfo.nextLevel?.experienceRequired} XP
                </text>
              </vstack>

              {/* Progress Bar - UPDATED: Smaller height */}
              <vstack gap="xsmall">
                <hstack 
                  width="100%" 
                  height={isSmallScreen ? "8px" : "12px"}
                  backgroundColor="rgba(0,0,0,0.1)" 
                  cornerRadius="medium"
                >
                  <hstack 
                    width={`${nextLevelInfo.progressPercentage}%`} 
                    height="100%" 
                    backgroundColor={CarnivalTheme.colors.accent}
                    cornerRadius="medium"
                  />
                </hstack>
                
                <hstack width="100%" alignment="middle">
                  <text size="xsmall" color={CarnivalTheme.colors.text}>
                    {userStats.experience} XP
                  </text>
                  <spacer grow />
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.accent}>
                    {nextLevelInfo.progressPercentage}% complete
                  </text>
                  <spacer grow />
                  <text size="xsmall" color={CarnivalTheme.colors.text}>
                    {nextLevelInfo.nextLevel?.experienceRequired} XP
                  </text>
                </hstack>
              </vstack>

              <vstack 
                padding="small"
                backgroundColor="rgba(59, 130, 246, 0.1)" 
                cornerRadius="medium"
                gap="xsmall"
              >
                <text size="small" weight="bold" color={CarnivalTheme.colors.primary} alignment="center">
                  {nextLevelInfo.experienceNeeded} XP to go!
                </text>
              </vstack>
            </vstack>
          )}

          {/* How to Earn XP Section - UPDATED: Smaller padding and text */}
          <vstack 
            padding="small"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.shadow}
            gap="small"
          >
            <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
              💡 How to Earn XP
            </text>
            
            <vstack gap="xsmall">
              <hstack gap="small" alignment="middle">
                <text size={isSmallScreen ? "medium" : "large"} color={CarnivalTheme.colors.primary}>🎮</text>
                <vstack gap="xxsmall" grow>
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text}>
                    Play any game
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                    Earn +1 XP for each game you participate in
                  </text>
                </vstack>
                <text size="small" weight="bold" color={CarnivalTheme.colors.accent}>
                  +1 XP
                </text>
              </hstack>

              <hstack gap="small" alignment="middle">
                <text size={isSmallScreen ? "medium" : "large"} color={CarnivalTheme.colors.success}>🎯</text>
                <vstack gap="xxsmall" grow>
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text}>
                    Guess correctly
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                    Bonus XP for spotting the lie correctly
                  </text>
                </vstack>
                <text size="small" weight="bold" color={CarnivalTheme.colors.accent}>
                  +2 XP
                </text>
              </hstack>

              <hstack gap="small" alignment="middle">
                <text size={isSmallScreen ? "medium" : "large"} color={CarnivalTheme.colors.warning}>🔥</text>
                <vstack gap="xxsmall" grow>
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text}>
                    Create engaging posts
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                    Big bonus when your post gets 5+ guesses
                  </text>
                </vstack>
                <text size="small" weight="bold" color={CarnivalTheme.colors.accent}>
                  +10 XP
                </text>
              </hstack>
            </vstack>
          </vstack>

          {/* Level Benefits Section - UPDATED: Smaller padding and text */}
          <vstack 
            padding="small"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.shadow}
            gap="small"
          >
            <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
              🎪 Level Benefits
            </text>
            
            <vstack gap="xsmall">
              <text size="xsmall" color={CarnivalTheme.colors.text} alignment="center">
                As you level up, you unlock:
              </text>
              
              <vstack gap="xxsmall">
                <hstack gap="xsmall" alignment="middle">
                  <text size="xsmall" color={CarnivalTheme.colors.primary}>🎨</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Exclusive user flair showing your rank and progress
                  </text>
                </hstack>
                
                <hstack gap="xsmall" alignment="middle">
                  <text size="xsmall" color={CarnivalTheme.colors.primary}>🏆</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Higher positions on leaderboards
                  </text>
                </hstack>
                
                <hstack gap="xsmall" alignment="middle">
                  <text size="xsmall" color={CarnivalTheme.colors.primary}>👑</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Prestigious titles that show your expertise
                  </text>
                </hstack>
                
                <hstack gap="xsmall" alignment="middle">
                  <text size="xsmall" color={CarnivalTheme.colors.primary}>🎉</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Recognition in the community
                  </text>
                </hstack>
              </vstack>
            </vstack>
          </vstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};