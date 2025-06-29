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
  const statements: Statement[] = [gamePost.truth1, gamePost.truth2, gamePost.lie];
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 380;

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

              // Determine the title for the description view
              let descriptionTitle = '';
              if (index === 0) descriptionTitle = 'Truth #1 Details';
              else if (index === 1) descriptionTitle = 'Truth #2 Details';

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
                  <hstack alignment="middle">
                    <vstack grow gap="xxsmall">
                      <text size={isSmallScreen ? "small" : "medium"} weight="bold" color={CarnivalTheme.colors.text} wrap>
                        {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                      </text>
                      <hstack gap="small" alignment="start">
                        {isUserChoice && (
                          <text color={CarnivalTheme.colors.primary} weight="bold" size={isSmallScreen ? "xsmall" : "small"}>
                            (Your choice)
                          </text>
                        )}
                        <text size={isSmallScreen ? "xsmall" : "small"} color={CarnivalTheme.colors.textLight}>
                          {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                        </text>
                      </hstack>
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

          {/* Always vertically stacked buttons */}
          <vstack gap="small" alignment="center" padding="xxsmall">
            {/* TESTING EXCEPTION: Back button only for u/liamlio */}
            {showBackButton && onBackToGuessing && (
              <button
                appearance="destructive"
                onPress={onBackToGuessing}
                width={isSmallScreen ? "100%" : "200px"}
              >
                🔄 Test Again (liamlio only)
              </button>
            )}
            
            <button
              appearance="secondary"
              onPress={onViewLeaderboard}
              width={isSmallScreen ? "100%" : "200px"}
            >
              View Leaderboard 🏆
            </button>
          </vstack>
          
          <text size={isSmallScreen ? "xsmall" : "small"} alignment="center" color={CarnivalTheme.colors.text}>
            💬 How surprising were the truths? Comment below!
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};