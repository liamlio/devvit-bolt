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
      <vstack width="100%" height="100%" padding="medium" gap="xxsmall" overflow="scroll">
        <CarnivalCard padding="small" gap="xxsmall">
          {/* Header with Back Button */}
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
            <spacer width="60px" />
          </hstack>

          {/* UPDATED: Current & Next Level in horizontal layout for large screens */}
          {isSmallScreen ? (
            /* Small screen: Keep vertical layout but with smaller gaps */
            <vstack gap="xxsmall">
              {/* Current Level */}
              <vstack 
                padding="small"
                backgroundColor={CarnivalTheme.colors.background} 
                cornerRadius="medium"
                border="thin"
                borderColor={CarnivalTheme.colors.primary}
                gap="xxsmall"
              >
                <hstack alignment="middle" gap="small">
                  <text size="medium" color={CarnivalTheme.colors.primary}>🎪</text>
                  <vstack gap="xxsmall" grow>
                    <text size="small" weight="bold" color={CarnivalTheme.colors.text}>
                      Level {currentLevel.level}: {currentLevel.name}
                    </text>
                    <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                      Current: {userStats.experience} XP
                    </text>
                  </vstack>
                </hstack>
              </vstack>

              {/* Next Level */}
              {nextLevelInfo.isMaxLevel ? (
                <vstack 
                  padding="small"
                  backgroundColor="rgba(255, 215, 0, 0.1)" 
                  cornerRadius="medium"
                  border="thin"
                  borderColor={CarnivalTheme.colors.accent}
                  gap="xxsmall"
                >
                  <hstack alignment="middle" gap="small">
                    <text size="medium" color={CarnivalTheme.colors.accent}>🏆</text>
                    <vstack gap="xxsmall" grow>
                      <text size="small" weight="bold" color={CarnivalTheme.colors.accent}>
                        Maximum Level Reached!
                      </text>
                      <text size="xsmall" color={CarnivalTheme.colors.text}>
                        You are the ultimate Carnival Legend!
                      </text>
                    </vstack>
                  </hstack>
                </vstack>
              ) : (
                <vstack 
                  padding="small"
                  backgroundColor={CarnivalTheme.colors.background} 
                  cornerRadius="medium"
                  border="thin"
                  borderColor={CarnivalTheme.colors.accent}
                  gap="xxsmall"
                >
                  <hstack alignment="middle" gap="small">
                    <text size="medium" color={CarnivalTheme.colors.accent}>🎯</text>
                    <vstack gap="xxsmall" grow>
                      <text size="small" weight="bold" color={CarnivalTheme.colors.accent}>
                        Next: Level {nextLevelInfo.nextLevel?.level}: {nextLevelInfo.nextLevel?.name}
                      </text>
                      <text size="xsmall" color={CarnivalTheme.colors.text}>
                        Need {nextLevelInfo.experienceNeeded} more XP ({nextLevelInfo.progressPercentage}% complete)
                      </text>
                    </vstack>
                  </hstack>
                  
                  {/* Progress Bar */}
                  <hstack 
                    width="100%" 
                    height="6px"
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
                </vstack>
              )}
            </vstack>
          ) : (
            /* Large screen: Horizontal layout for current and next level */
            <hstack gap="small">
              {/* Current Level */}
              <vstack 
                grow
                padding="small"
                backgroundColor={CarnivalTheme.colors.background} 
                cornerRadius="medium"
                border="thin"
                borderColor={CarnivalTheme.colors.primary}
                gap="xxsmall"
              >
                <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                  Current Level
                </text>
                <vstack gap="xxsmall" alignment="center">
                  <text size="large" color={CarnivalTheme.colors.primary}>🎪</text>
                  <text size="small" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                    Level {currentLevel.level}
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} alignment="center">
                    {currentLevel.name}
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight} alignment="center">
                    {userStats.experience} XP
                  </text>
                </vstack>
              </vstack>

              {/* Next Level */}
              {nextLevelInfo.isMaxLevel ? (
                <vstack 
                  grow
                  padding="small"
                  backgroundColor="rgba(255, 215, 0, 0.1)" 
                  cornerRadius="medium"
                  border="thin"
                  borderColor={CarnivalTheme.colors.accent}
                  gap="xxsmall"
                  alignment="center"
                >
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.accent} alignment="center">
                    Maximum Level!
                  </text>
                  <text size="large" color={CarnivalTheme.colors.accent}>🏆</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} alignment="center">
                    You've reached the top!
                  </text>
                </vstack>
              ) : (
                <vstack 
                  grow
                  padding="small"
                  backgroundColor={CarnivalTheme.colors.background} 
                  cornerRadius="medium"
                  border="thin"
                  borderColor={CarnivalTheme.colors.accent}
                  gap="xxsmall"
                >
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                    Next Level
                  </text>
                  <vstack gap="xxsmall" alignment="center">
                    <text size="large" color={CarnivalTheme.colors.accent}>🎯</text>
                    <text size="small" weight="bold" color={CarnivalTheme.colors.accent} alignment="center">
                      Level {nextLevelInfo.nextLevel?.level}
                    </text>
                    <text size="xsmall" color={CarnivalTheme.colors.text} alignment="center">
                      {nextLevelInfo.nextLevel?.name}
                    </text>
                    <text size="xsmall" color={CarnivalTheme.colors.textLight} alignment="center">
                      {nextLevelInfo.experienceNeeded} XP to go
                    </text>
                  </vstack>
                  
                  {/* Progress Bar */}
                  <vstack gap="xxsmall">
                    <hstack 
                      width="100%" 
                      height="8px"
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
                    <text size="xsmall" color={CarnivalTheme.colors.accent} alignment="center">
                      {nextLevelInfo.progressPercentage}% complete
                    </text>
                  </vstack>
                </vstack>
              )}
            </hstack>
          )}

          {/* UPDATED: How to Earn XP & Benefits in horizontal layout */}
          <hstack gap="small">
            {/* How to Earn XP */}
            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.shadow}
              gap="xxsmall"
            >
              <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                💡 Earn XP
              </text>
              
              <vstack gap="xxsmall">
                <hstack gap="xsmall" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>🎮</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Play games
                  </text>
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.accent}>
                    +1
                  </text>
                </hstack>

                <hstack gap="xsmall" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.success}>🎯</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Guess correctly
                  </text>
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.accent}>
                    +2
                  </text>
                </hstack>

                <hstack gap="xsmall" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.warning}>🔥</text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Viral posts (5+ guesses)
                  </text>
                  <text size="xsmall" weight="bold" color={CarnivalTheme.colors.accent}>
                    +10
                  </text>
                </hstack>
              </vstack>
            </vstack>

            {/* Level Benefits */}
            <vstack 
              grow
              padding="small"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.shadow}
              gap="xxsmall"
            >
              <text size="xsmall" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                🎪 Benefits
              </text>
              
              <vstack gap="xxsmall">
                <hstack gap="xsmall" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>🎨 </text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Exclusive flair
                  </text>
                </hstack>
                
                <hstack gap="xsmall" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>🎉 </text>
                  <text size="xsmall" color={CarnivalTheme.colors.text} grow>
                    Community recognition
                  </text>
                </hstack>
              </vstack>
            </vstack>
          </hstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};