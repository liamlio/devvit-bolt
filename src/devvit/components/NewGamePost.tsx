import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';

interface NewGamePostProps {
  onCreateGame: () => void;
}

export const NewGamePost = ({ onCreateGame }: NewGamePostProps): JSX.Element => (
  <blocks height="tall">
    <CarnivalBackground>
      <vstack width="100%" height="100%" alignment="center middle" padding="large" overflow="scroll">
        <CarnivalCard>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪</text>
          <text size="xlarge" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
            Configure Your Game
          </text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            This post needs to be configured with your Two Truths One Lie game!
          </text>
          
          <vstack gap="small" padding="medium" backgroundColor={CarnivalTheme.colors.background} cornerRadius="medium">
            <text weight="bold" color={CarnivalTheme.colors.text}>Ready to create your game?</text>
            <text size="small" color={CarnivalTheme.colors.textLight}>
              Create two true statements and one convincing lie!
            </text>
          </vstack>

          <button
            appearance="primary"
            onPress={onCreateGame}
          >
            Create Your Game! 🎪
          </button>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  </blocks>
);