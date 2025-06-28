import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { GamePost, Statement } from '../../shared/types/game.js';

interface GamePlayInterfaceProps {
  gamePost: GamePost;
  selectedIndex: number | null;
  onSelectStatement: (index: number) => void;
  onSubmitGuess: () => void;
}

export const GamePlayInterface = ({ 
  gamePost, 
  selectedIndex, 
  onSelectStatement, 
  onSubmitGuess 
}: GamePlayInterfaceProps): JSX.Element => {
  const statements: Statement[] = [gamePost.truth1, gamePost.truth2, gamePost.lie];

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding="xlarge" gap="medium" overflow="scroll">
        <CarnivalCard padding="large">
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
                padding="medium"
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

          <button
            appearance="primary"
            onPress={onSubmitGuess}
            disabled={selectedIndex === null}
          >
            Submit Guess! 🎯
          </button>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};