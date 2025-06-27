import { Devvit, useForm } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement } from '../../shared/types/game.js';

interface CreateGameInterfaceProps {
  onBack: () => void;
  onShowToast: (message: string) => void;
  onCreateGame: (truth1: Statement, truth2: Statement, lie: Statement) => Promise<void>;
}

export const CreateGameInterface = ({ onBack, onShowToast, onCreateGame }: CreateGameInterfaceProps): JSX.Element => {
  // Improvement 2: Create game form directly in the configuration post
  const createGameForm = useForm(
    {
      title: '🎪 Create Your Two Truths One Lie Game',
      description: 'Create two true statements and one lie. Players will try to guess which statement is false!',
      acceptLabel: 'Create Game! 🎪',
      cancelLabel: 'Cancel',
      fields: [
        {
          type: 'paragraph',
          name: 'truth1',
          label: 'Truth #1 ✅',
          helpText: 'Enter your first true statement',
          required: true,
        },
        {
          type: 'string',
          name: 'truth1Description',
          label: 'Truth #1 Details (Optional)',
          helpText: 'Add details to make it more believable',
          required: false,
        },
        {
          type: 'paragraph',
          name: 'truth2',
          label: 'Truth #2 ✅',
          helpText: 'Enter your second true statement',
          required: true,
        },
        {
          type: 'string',
          name: 'truth2Description',
          label: 'Truth #2 Details (Optional)',
          helpText: 'Add details to make it more believable',
          required: false,
        },
        {
          type: 'paragraph',
          name: 'lie',
          label: 'The Lie ❌',
          helpText: 'Enter your convincing lie',
          required: true,
        },
      ],
    },
    async (values) => {
      try {
        const truth1: Statement = {
          text: values.truth1!,
          description: values.truth1Description || undefined,
        };
        const truth2: Statement = {
          text: values.truth2!,
          description: values.truth2Description || undefined,
        };
        const lie: Statement = {
          text: values.lie!,
        };

        await onCreateGame(truth1, truth2, lie);
      } catch (error) {
        console.error('Error creating game:', error);
        onShowToast('Error creating game. Please try again.');
      }
    }
  );

  return (
    <blocks height="tall">
      <CarnivalBackground>
        <vstack width="100%" height="100%" alignment="center middle" padding="large">
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
                onPress={() => {
                  // Improvement 2: Show the form directly instead of just a toast
                  createGameForm.showForm();
                }}
              >
                Create Game! 🎪
              </button>
            </hstack>
          </CarnivalCard>
        </vstack>
      </CarnivalBackground>
    </blocks>
  );
};