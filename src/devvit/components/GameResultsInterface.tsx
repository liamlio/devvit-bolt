import { Devvit, Context, useAsync } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import { GameService } from '../service/GameService.js';
import type { GamePost, Statement, UserGuess, GameSettings } from '../../shared/types/game.js';

interface GameResultsInterfaceProps {
  context: Context;
  gamePost: GamePost;
  userGuess?: UserGuess;
  gameSettings: GameSettings;
  onViewDescription: (statement: Statement, title: string) => void;
  onViewLeaderboard: () => void;
  onReturnToHub: () => void;
  onCreatePost: () => void;
}

export const GameResultsInterface = ({ 
  context,
  gamePost, 
  userGuess, 
  gameSettings,
  onViewDescription,
  onViewLeaderboard,
  onReturnToHub,
  onCreatePost
}: GameResultsInterfaceProps): JSX.Element => {
  // FIXED: Create the statements array in the same order as displayed in GamePlayInterface
  const statements: Statement[] = [null, null, null];
  
  // Place the lie at the correct position
  statements[gamePost.lieIndex] = gamePost.lie;
  
  // Fill remaining positions with truths
  let truthIndex = 0;
  for (let i = 0; i < 3; i++) {
    if (statements[i] === null) {
      statements[i] = truthIndex === 0 ? gamePost.truth1 : gamePost.truth2;
      truthIndex++;
    }
  }
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  // NEW: Handle navigation to twotruthsonelie subreddit
  const handleViewLeaderboard = () => {
    // Navigate to the twotruthsonelie subreddit specifically
    context.ui.navigateTo('https://www.reddit.com/r/twotruthsonelie');
  };

  const handleReturnToHub = () => {
    // Navigate to the twotruthsonelie subreddit specifically
    context.ui.navigateTo('https://www.reddit.com/r/twotruthsonelie');
  };

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding={isSmallScreen ? "small" : "medium"} gap="small">
        <CarnivalCard padding={isSmallScreen ? "medium" : "small"}>
          <vstack width="100%" height="100%" padding="xxsmall" gap="xxsmall">
            <text size={isSmallScreen ? "large" : "xxlarge"} alignment="center" color={CarnivalTheme.colors.text}>🎪 Results</text>
            <text size={isSmallScreen ? "small" : "medium"} alignment="center" color={CarnivalTheme.colors.text}>
              {userGuess?.isCorrect 
                ? '🎉 Congratulations! You spotted the lie!' 
                : '😅 Nice try! Better luck next time!'
              }
            </text>
            <text size={isSmallScreen ? "xsmall" : "small"} alignment="center" color={CarnivalTheme.colors.textLight}>
              By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} {gamePost.totalGuesses !== 1 ? 'have' : 'has'} guessed
            </text>
          </vstack>

          <vstack gap={isSmallScreen ? "small" : "xxsmall"} padding="xxsmall">
            {statements.map((statement, index) => {
              const isLie = index === gamePost.lieIndex;
              const isUserChoice = userGuess?.guessIndex === index;
              const votes = gamePost.guessBreakdown[index];
              const percentage = gamePost.totalGuesses > 0 
                ? Math.round((votes / gamePost.totalGuesses) * 100) 
                : 0;

              // Determine the title for the description view based on the original statement
              let descriptionTitle = '';
              if (statement === gamePost.truth1) descriptionTitle = 'Truth #1 Details';
              else if (statement === gamePost.truth2) descriptionTitle = 'Truth #2 Details';

              return (
                <vstack 
                  key={index} 
                  padding={isSmallScreen ? "medium" : "small"}
                  backgroundColor={isLie ? "rgba(255,68,68,0.2)" : "rgba(50,205,50,0.2)"} 
                  cornerRadius="medium"
                  border="thick"
                  borderColor={isLie ? CarnivalTheme.colors.danger : CarnivalTheme.colors.success}
                  gap="small"
                >
                  <hstack alignment="middle">
                    <text grow size={isSmallScreen ? "small" : "medium"} weight="bold" color={CarnivalTheme.colors.text} wrap>
                      {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                    </text>
                    <vstack gap="xxsmall" alignment="end">
                      {isUserChoice && (
                        <text color={CarnivalTheme.colors.primary} weight="bold" size={isSmallScreen ? "small" : "small"}>
                          (Your choice)
                        </text>
                      )}
                      <text size={isSmallScreen ? "small" : "small"} color={CarnivalTheme.colors.textLight}>
                        {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                      </text>
                    </vstack>
                  </hstack>
                  
                  {/* Show expand button for truths with descriptions */}
                  {!isLie && statement.description && (
                    <button
                      appearance="secondary"
                      size="small"
                      onPress={() => onViewDescription(statement, descriptionTitle)}
                      width={isSmallScreen ? "100%" : undefined}
                    >
                      📖 Expand Description
                    </button>
                  )}
                </vstack>
              );
            })}
          </vstack>

          {/* CLEANED UP: Removed all test-specific functionality */}
          <vstack gap="small" alignment="center" padding="xxsmall">
            {/* Create Post button */}
            <button
              appearance="primary"
              onPress={onCreatePost}
              width="100%"
              size={isSmallScreen ? "medium" : "large"}
            >
              ➕ Create Post
            </button>
            
            {/* Return to Hub and View Leaderboard side by side */}
            <hstack gap="small" width="100%">
              <button
                appearance="secondary"
                onPress={handleReturnToHub}
                grow
                size="small"
              >
                🏠 Return to Hub
              </button>
              <button
                appearance="secondary"
                onPress={handleViewLeaderboard}
                grow
                size="small"
              >
                🏆 View Leaderboard
              </button>
            </hstack>
          </vstack>
          
          <text size={isSmallScreen ? "xsmall" : "small"} alignment="center" color={CarnivalTheme.colors.text}>
            💬 How surprising were the truths? Comment below!
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};