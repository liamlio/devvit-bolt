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
              🎯 Level Progress
            </text>
            <spacer width="60px" /> {/* Balance the back button */}
          </hstack>

          {/* Current Level Section */}
          <vstack 
            padding="medium"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.primary}
            gap="medium"
          >
            <text size="medium" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
              Current Level
            </text>
            
            <vstack gap="small" alignment="center">
              <text size="xxlarge" color={CarnivalTheme.colors.primary}>
                🎪
              </text>
              <text size="large" weight="bold" color={CarnivalTheme.colors.text}>
                Level {currentLevel.level}: {currentLevel.name}
              </text>
              <text size="medium" color={CarnivalTheme.colors.text}>
                {userStats.experience} XP
              </text>
            </vstack>
          </vstack>

          {/* Next Level Section */}
          {nextLevelInfo.isMaxLevel ? (
            <vstack 
              padding="medium"
              backgroundColor="rgba(255, 215, 0, 0.1)" 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.accent}
              gap="medium"
              alignment="center"
            >
              <text size="xxlarge" color={CarnivalTheme.colors.accent}>
                🏆
              </text>
              <text size="large" weight="bold" color={CarnivalTheme.colors.accent} alignment="center">
                Maximum Level Reached!
              </text>
              <text size="medium" color={CarnivalTheme.colors.text} alignment="center">
                You've achieved the highest rank: Carnival Legend!
              </text>
              <text size="small" color={CarnivalTheme.colors.textLight} alignment="center">
                You are truly a master of the carnival of deception!
              </text>
            </vstack>
          ) : (
            <vstack 
              padding="medium"
              backgroundColor={CarnivalTheme.colors.background} 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.accent}
              gap="medium"
            >
              <text size="medium" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
                Next Level
              </text>
              
              <vstack gap="small" alignment="center">
                <text size="large" weight="bold" color={CarnivalTheme.colors.accent}>
                  Level {nextLevelInfo.nextLevel?.level}: {nextLevelInfo.nextLevel?.name}
                </text>
                <text size="medium" color={CarnivalTheme.colors.text}>
                  Requires {nextLevelInfo.nextLevel?.experienceRequired} XP
                </text>
              </vstack>

              {/* Progress Bar */}
              <vstack gap="small">
                <hstack 
                  width="100%" 
                  height="12px" 
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
                  <text size="small" color={CarnivalTheme.colors.text}>
                    {userStats.experience} XP
                  </text>
                  <spacer grow />
                  <text size="small" weight="bold" color={CarnivalTheme.colors.accent}>
                    {nextLevelInfo.progressPercentage}% complete
                  </text>
                  <spacer grow />
                  <text size="small" color={CarnivalTheme.colors.text}>
                    {nextLevelInfo.nextLevel?.experienceRequired} XP
                  </text>
                </hstack>
              </vstack>

              <vstack 
                padding="medium"
                backgroundColor="rgba(59, 130, 246, 0.1)" 
                cornerRadius="medium"
                gap="small"
              >
                <text size="medium" weight="bold" color={CarnivalTheme.colors.primary} alignment="center">
                  {nextLevelInfo.experienceNeeded} XP to go!
                </text>
              </vstack>
            </vstack>
          )}

          {/* How to Earn XP Section */}
          <vstack 
            padding="medium"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.shadow}
            gap="medium"
          >
            <text size="medium" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
              💡 How to Earn XP
            </text>
            
            <vstack gap="small">
              <hstack gap="medium" alignment="middle">
                <text size="large" color={CarnivalTheme.colors.primary}>🎮</text>
                <vstack gap="xsmall" grow>
                  <text size="small" weight="bold" color={CarnivalTheme.colors.text}>
                    Play any game
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                    Earn +1 XP for each game you participate in
                  </text>
                </vstack>
                <text size="medium" weight="bold" color={CarnivalTheme.colors.accent}>
                  +1 XP
                </text>
              </hstack>

              <hstack gap="medium" alignment="middle">
                <text size="large" color={CarnivalTheme.colors.success}>🎯</text>
                <vstack gap="xsmall" grow>
                  <text size="small" weight="bold" color={CarnivalTheme.colors.text}>
                    Guess correctly
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                    Bonus XP for spotting the lie correctly
                  </text>
                </vstack>
                <text size="medium" weight="bold" color={CarnivalTheme.colors.accent}>
                  +2 XP
                </text>
              </hstack>

              <hstack gap="medium" alignment="middle">
                <text size="large" color={CarnivalTheme.colors.warning}>🔥</text>
                <vstack gap="xsmall" grow>
                  <text size="small" weight="bold" color={CarnivalTheme.colors.text}>
                    Create engaging posts
                  </text>
                  <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                    Big bonus when your post gets 5+ guesses
                  </text>
                </vstack>
                <text size="medium" weight="bold" color={CarnivalTheme.colors.accent}>
                  +10 XP
                </text>
              </hstack>
            </vstack>
          </vstack>

          {/* Level Benefits Section */}
          <vstack 
            padding="medium"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.shadow}
            gap="medium"
          >
            <text size="medium" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
              🎪 Level Benefits
            </text>
            
            <vstack gap="small">
              <text size="small" color={CarnivalTheme.colors.text} alignment="center">
                As you level up, you unlock:
              </text>
              
              <vstack gap="xsmall">
                <hstack gap="small" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>🎨</text>
                  <text size="small" color={CarnivalTheme.colors.text} grow>
                    Exclusive user flair showing your rank and progress
                  </text>
                </hstack>
                
                <hstack gap="small" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>🏆</text>
                  <text size="small" color={CarnivalTheme.colors.text} grow>
                    Higher positions on leaderboards
                  </text>
                </hstack>
                
                <hstack gap="small" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>👑</text>
                  <text size="small" color={CarnivalTheme.colors.text} grow>
                    Prestigious titles that show your expertise
                  </text>
                </hstack>
                
                <hstack gap="small" alignment="middle">
                  <text size="small" color={CarnivalTheme.colors.primary}>🎉</text>
                  <text size="small" color={CarnivalTheme.colors.text} grow>
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