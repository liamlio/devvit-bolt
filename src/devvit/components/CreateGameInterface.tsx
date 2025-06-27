import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';

interface CreateGameInterfaceProps {
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export const CreateGameInterface = ({ onBack, onShowToast }: CreateGameInterfaceProps): JSX.Element => (
  <blocks height="tall">
    <CarnivalBackground>
      <vstack width="100%" height="100%" alignment="center middle" padding="large">
        <CarnivalCard>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.
          </text>
          
          <hstack gap="medium">
            <button
              appearance="secondary"
              onPress={onBack}
            >
              Back
            </button>
            <button
              appearance="primary"
              onPress={() => onShowToast('Use the menu action "[TTOL] New Two Truths One Lie Post" to create posts.')}
            >
              Create Game Post!
            </button>
          </hstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  </blocks>
);