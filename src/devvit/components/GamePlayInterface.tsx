import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { GamePost, Statement } from '../../shared/types/game.js';

interface GamePlayInterfaceProps {
  context: Context;
  gamePost: GamePost;
  selectedIndex: number | null;
  onSelectStatement: (index: number) => void;
  onSubmitGuess: () => void;
  // NEW: Add callback for author to view results
  onViewResults?: () => void;
}

export const GamePlayInterface = ({ 
  context,
  gamePost, 
  selectedIndex, 
  onSelectStatement, 
  onSubmitGuess,
  onViewResults
}: GamePlayInterfaceProps): JSX.Element => {
  // FIXED: Create the statements array in the order they should be displayed
  // The lieIndex tells us where the lie should appear in the display
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

  // NEW: Check if current user is the post author
  const isAuthor = context.userId === gamePost.authorId;

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding={isSmallScreen ? "medium" : "large"} gap="medium" overflow="scroll">
        <CarnivalCard padding={isSmallScreen ? "small" : "medium"}>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Two Truths One Lie</text>
          <text alignment="center" color={CarnivalTheme.colors.textLight}>
            Can you spot the lie? Choose the statement you think is false!
          </text>
          <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
            By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
          </text>

          <vstack gap="small" overflow="scroll">
            {statements.map((statement, index) => (
              <vstack
                key={index}
                padding={isSmallScreen ? "small" : "medium"}
                backgroundColor={selectedIndex === index ? CarnivalTheme.colors.accent : CarnivalTheme.colors.background}
                cornerRadius="large"
                border="thick"
                borderColor={selectedIndex === index ? CarnivalTheme.colors.primary : CarnivalTheme.colors.shadow}
                onPress={() => onSelectStatement(index)}
              >
                <text alignment="start" color={CarnivalTheme.colors.text} weight="bold" wrap>
                  {statement.text}
                </text>
              </vstack>
            ))}
          </vstack>

          {/* NEW: Conditional rendering based on whether user is the author */}
          {isAuthor ? (
            /* Author view: Show "View Results" button instead of guess submission */
            <vstack gap="small" alignment="center">
              <text size="small" alignment="center" color={CarnivalTheme.colors.primary} weight="bold">
                👑 You created this post
              </text>
              <button
                appearance="primary"
                onPress={onViewResults}
                width={isSmallScreen ? "100%" : undefined}
              >
                📊 View Results So Far
              </button>
              <text size="xsmall" alignment="center" color={CarnivalTheme.colors.textLight}>
                See how players are guessing on your post
              </text>
            </vstack>
          ) : (
            /* Regular player view: Show guess submission */
            <button
              appearance="primary"
              onPress={onSubmitGuess}
              disabled={selectedIndex === null}
              width={isSmallScreen ? "100%" : undefined}
            >
              Submit Guess! 🎯
            </button>
          )}
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};