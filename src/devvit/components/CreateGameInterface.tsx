import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';

interface CreateGameInterfaceProps {
  onBack: () => void;
  onShowToast: (message: string) => void;
  onShowCreateGameForm: () => void;
}

export const CreateGameInterface = ({ onBack, onShowToast, onShowCreateGameForm }: CreateGameInterfaceProps): JSX.Element => {
  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" alignment="center middle" padding="large" overflow="scroll">
        <CarnivalCard>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            Ready to create your Two Truths One Lie game? Fill out the form to get started!
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
              onPress={onShowCreateGameForm}
            >
              Create Game! 🎪
            </button>
          </hstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};