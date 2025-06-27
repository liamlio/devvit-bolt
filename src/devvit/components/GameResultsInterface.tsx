import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { GamePost, Statement, UserGuess } from '../../shared/types/game.js';

interface GameResultsInterfaceProps {
  gamePost: GamePost;
  userGuess?: UserGuess;
  onViewLeaderboard: () => void;
}

export const GameResultsInterface = ({ 
  gamePost, 
  userGuess, 
  onViewLeaderboard 
}: GameResultsInterfaceProps): JSX.Element => {
  const statements: Statement[] = [gamePost.truth1, gamePost.truth2, gamePost.lie];

  return (
    <blocks height="tall">
      <CarnivalBackground>
        <vstack width="100%" height="100%" padding="large" gap="medium">
          <CarnivalCard>
            <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Results</text>
            <text alignment="center" color={CarnivalTheme.colors.text}>
              {userGuess?.isCorrect 
                ? '🎉 Congratulations! You spotted the lie!' 
                : '😅 Nice try! Better luck next time!'
              }
            </text>
            <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
              By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
            </text>

            <vstack gap="small">
              {statements.map((statement, index) => {
                const isLie = index === gamePost.lieIndex;
                const isUserChoice = userGuess?.guessIndex === index;
                const votes = gamePost.guessBreakdown[index];
                const percentage = gamePost.totalGuesses > 0 
                  ? Math.round((votes / gamePost.totalGuesses) * 100) 
                  : 0;

                return (
                  <vstack 
                    key={index} 
                    padding="medium" 
                    backgroundColor={isLie ? "rgba(255,68,68,0.2)" : "rgba(50,205,50,0.2)"} 
                    cornerRadius="medium"
                    border="thick"
                    borderColor={isLie ? CarnivalTheme.colors.danger : CarnivalTheme.colors.success}
                  >
                    <hstack>
                      <text grow weight="bold" color={CarnivalTheme.colors.text}>
                        {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                      </text>
                      {isUserChoice && (
                        <text color={CarnivalTheme.colors.primary} weight="bold">(Your choice)</text>
                      )}
                    </hstack>
                    
                    {!isLie && statement.description && (
                      <text size="small" color={CarnivalTheme.colors.textLight}>
                        Details: {statement.description}
                      </text>
                    )}
                    
                    <text size="small" color={CarnivalTheme.colors.textLight}>
                      {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                    </text>
                  </vstack>
                );
              })}
            </vstack>

            <text alignment="center" color={CarnivalTheme.colors.text}>
              💬 How surprising were the truths? Comment below!
            </text>

            <button
              appearance="secondary"
              onPress={onViewLeaderboard}
            >
              <text color={CarnivalTheme.colors.text} weight="bold">View Leaderboard 🏆</text>
            </button>
          </CarnivalCard>
        </vstack>
      </CarnivalBackground>
    </blocks>
  );
};