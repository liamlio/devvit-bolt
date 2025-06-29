import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { GamePost, Statement, UserGuess } from '../../shared/types/game.js';

interface GameResultsInterfaceProps {
  context: Context;
  gamePost: GamePost;
  userGuess?: UserGuess;
  onViewLeaderboard: () => void;
  onViewDescription: (statement: Statement, title: string) => void;
  // TESTING EXCEPTION: Optional back button for u/liamlio testing
  showBackButton?: boolean;
  onBackToGuessing?: () => void;
}

export const GameResultsInterface = ({ 
  context,
  gamePost, 
  userGuess, 
  onViewLeaderboard,
  onViewDescription,
  showBackButton = false,
  onBackToGuessing
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

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding={isSmallScreen ? "small" : "medium"} gap="small">
        <CarnivalCard padding="small">
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

          <vstack gap="xxsmall" padding="xxsmall">
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
                  padding={isSmallScreen ? "xsmall" : "small"}
                  backgroundColor={isLie ? "rgba(255,68,68,0.2)" : "rgba(50,205,50,0.2)"} 
                  cornerRadius="medium"
                  border="thick"
                  borderColor={isLie ? CarnivalTheme.colors.danger : CarnivalTheme.colors.success}
                  gap="small"
                >
                  {/* Responsive layout for statement and vote info */}
                  {isSmallScreen ? (
                    // Small screens: statement above, vote info horizontally below
                    <vstack gap="small">
                      <text size="small" weight="bold" color={CarnivalTheme.colors.text} wrap>
                        {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                      </text>
                      <hstack gap="small" alignment="start">
                        <text size="xsmall" color={CarnivalTheme.colors.textLight}>
                          {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                        </text>
                        {isUserChoice && (
                          <text color={CarnivalTheme.colors.primary} weight="bold" size="xsmall">
                            (Your choice)
                          </text>
                        )}
                      </hstack>
                    </vstack>
                  ) : (
                    // Large screens: statement on left, vote info vertically stacked on right
                    <hstack alignment="middle">
                      <text grow size="medium" weight="bold" color={CarnivalTheme.colors.text} wrap>
                        {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                      </text>
                      <vstack gap="xxsmall" alignment="end">
                        {isUserChoice && (
                          <text color={CarnivalTheme.colors.primary} weight="bold" size="small">
                            (Your choice)
                          </text>
                        )}
                        <text size="small" color={CarnivalTheme.colors.textLight}>
                          {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                        </text>
                      </vstack>
                    </hstack>
                  )}
                  
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

          {/* Responsive button layout - horizontal on all screens, shorten button names on smaller screens */}
          {isSmallScreen ? (
            <hstack gap="small" alignment="center" padding="xxsmall">
              {/* TESTING EXCEPTION: Back button only for u/liamlio */}
              {showBackButton && onBackToGuessing && (
                <button
                  appearance="destructive"
                  onPress={onBackToGuessing}
                  size="small"
                >
                  🔄 Test Again
                </button>
              )}
              
              <button
                appearance="secondary"
                onPress={onViewLeaderboard}
                size="small"
              >
                View Leaderboard 🏆
              </button>
            </hstack>
          ) : (
            <hstack gap="small" alignment="center" padding="xxsmall">
              {/* TESTING EXCEPTION: Back button only for u/liamlio */}
              {showBackButton && onBackToGuessing && (
                <button
                  appearance="destructive"
                  onPress={onBackToGuessing}
                  width="200px"
                >
                  🔄 Test Again (liamlio only)
                </button>
              )}
              
              <button
                appearance="secondary"
                onPress={onViewLeaderboard}
                width="200px"
              >
                View Leaderboard 🏆
              </button>
            </hstack>
          )}
          
          <text size={isSmallScreen ? "xsmall" : "small"} alignment="center" color={CarnivalTheme.colors.text}>
            💬 How surprising were the truths? Comment below!
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};