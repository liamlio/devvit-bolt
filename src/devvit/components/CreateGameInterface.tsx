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
  // Character limits
  const CHARACTER_LIMITS = {
    statement: 200,
    description: 500,
  };

  // Create game form with character limits and better validation
  const createGameForm = useForm(
    {
      title: '🎪 Create Your Two Truths One Lie Game',
      description: `Create two true statements and one lie. Players will try to guess which statement is false!

Character Limits:
• Statements: ${CHARACTER_LIMITS.statement} characters
• Details: ${CHARACTER_LIMITS.description} characters`,
      acceptLabel: 'Create Game! 🎪',
      cancelLabel: 'Cancel',
      fields: [
        {
          type: 'paragraph',
          name: 'truth1',
          label: `Truth #1 ✅ (max ${CHARACTER_LIMITS.statement} chars)`,
          helpText: 'Enter your first true statement',
          required: true,
        },
        {
          type: 'paragraph',
          name: 'truth1Description',
          label: `Truth #1 Details - Optional (max ${CHARACTER_LIMITS.description} chars)`,
          helpText: 'Add details to make it more believable',
          required: false,
        },
        {
          type: 'paragraph',
          name: 'truth2',
          label: `Truth #2 ✅ (max ${CHARACTER_LIMITS.statement} chars)`,
          helpText: 'Enter your second true statement',
          required: true,
        },
        {
          type: 'paragraph',
          name: 'truth2Description',
          label: `Truth #2 Details - Optional (max ${CHARACTER_LIMITS.description} chars)`,
          helpText: 'Add details to make it more believable',
          required: false,
        },
        {
          type: 'paragraph',
          name: 'lie',
          label: `The Lie ❌ (max ${CHARACTER_LIMITS.statement} chars)`,
          helpText: 'Enter your convincing lie',
          required: true,
        },
      ],
    },
    async (values) => {
      try {
        // Validate character limits
        const errors: string[] = [];

        if (!values.truth1?.trim()) {
          errors.push('Truth #1 is required');
        } else if (values.truth1.length > CHARACTER_LIMITS.statement) {
          errors.push(`Truth #1 exceeds ${CHARACTER_LIMITS.statement} character limit (${values.truth1.length} chars)`);
        }

        if (!values.truth2?.trim()) {
          errors.push('Truth #2 is required');
        } else if (values.truth2.length > CHARACTER_LIMITS.statement) {
          errors.push(`Truth #2 exceeds ${CHARACTER_LIMITS.statement} character limit (${values.truth2.length} chars)`);
        }

        if (!values.lie?.trim()) {
          errors.push('The lie is required');
        } else if (values.lie.length > CHARACTER_LIMITS.statement) {
          errors.push(`The lie exceeds ${CHARACTER_LIMITS.statement} character limit (${values.lie.length} chars)`);
        }

        if (values.truth1Description && values.truth1Description.length > CHARACTER_LIMITS.description) {
          errors.push(`Truth #1 details exceed ${CHARACTER_LIMITS.description} character limit (${values.truth1Description.length} chars)`);
        }

        if (values.truth2Description && values.truth2Description.length > CHARACTER_LIMITS.description) {
          errors.push(`Truth #2 details exceed ${CHARACTER_LIMITS.description} character limit (${values.truth2Description.length} chars)`);
        }

        if (errors.length > 0) {
          onShowToast(`Please fix these issues: ${errors.join(', ')}`);
          return;
        }

        const truth1: Statement = {
          text: values.truth1!.trim(),
          description: values.truth1Description?.trim() || undefined,
        };
        const truth2: Statement = {
          text: values.truth2!.trim(),
          description: values.truth2Description?.trim() || undefined,
        };
        const lie: Statement = {
          text: values.lie!.trim(),
        };

        await onCreateGame(truth1, truth2, lie);
      } catch (error) {
        console.error('Error creating game:', error);
        onShowToast('Error creating game. Please try again.');
      }
    }
  );

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" alignment="center middle" padding="large" overflow="scroll">
        <CarnivalCard>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            Ready to create your Two Truths One Lie game? Fill out the form to get started!
          </text>
          
          <vstack 
            padding="medium" 
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.primary}
            gap="small"
          >
            <text weight="bold" color={CarnivalTheme.colors.text}>📝 Character Limits:</text>
            <text size="small" color={CarnivalTheme.colors.textLight}>
              • Statements: {CHARACTER_LIMITS.statement} characters max
            </text>
            <text size="small" color={CarnivalTheme.colors.textLight}>
              • Details: {CHARACTER_LIMITS.description} characters max
            </text>
            <text size="small" color={CarnivalTheme.colors.textLight}>
              💡 Your text will be preserved if you exceed limits - just edit and resubmit!
            </text>
          </vstack>
          
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
                createGameForm.showForm();
              }}
            >
              Create Game! 🎪
            </button>
          </hstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};