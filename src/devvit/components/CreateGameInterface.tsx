import { Devvit, useState } from '@devvit/public-api';
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

  // Form state
  const [truth1Text, setTruth1Text] = useState('');
  const [truth1DescriptionText, setTruth1DescriptionText] = useState('');
  const [truth2Text, setTruth2Text] = useState('');
  const [truth2DescriptionText, setTruth2DescriptionText] = useState('');
  const [lieText, setLieText] = useState('');

  // Error state
  const [truth1Error, setTruth1Error] = useState('');
  const [truth1DescriptionError, setTruth1DescriptionError] = useState('');
  const [truth2Error, setTruth2Error] = useState('');
  const [truth2DescriptionError, setTruth2DescriptionError] = useState('');
  const [lieError, setLieError] = useState('');

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input handlers with live validation
  const handleTruth1Change = (text: string) => {
    setTruth1Text(text);
    if (text.length > CHARACTER_LIMITS.statement) {
      setTruth1Error(`Exceeds ${CHARACTER_LIMITS.statement} character limit`);
    } else {
      setTruth1Error('');
    }
  };

  const handleTruth1DescriptionChange = (text: string) => {
    setTruth1DescriptionText(text);
    if (text.length > CHARACTER_LIMITS.description) {
      setTruth1DescriptionError(`Exceeds ${CHARACTER_LIMITS.description} character limit`);
    } else {
      setTruth1DescriptionError('');
    }
  };

  const handleTruth2Change = (text: string) => {
    setTruth2Text(text);
    if (text.length > CHARACTER_LIMITS.statement) {
      setTruth2Error(`Exceeds ${CHARACTER_LIMITS.statement} character limit`);
    } else {
      setTruth2Error('');
    }
  };

  const handleTruth2DescriptionChange = (text: string) => {
    setTruth2DescriptionText(text);
    if (text.length > CHARACTER_LIMITS.description) {
      setTruth2DescriptionError(`Exceeds ${CHARACTER_LIMITS.description} character limit`);
    } else {
      setTruth2DescriptionError('');
    }
  };

  const handleLieChange = (text: string) => {
    setLieText(text);
    if (text.length > CHARACTER_LIMITS.statement) {
      setLieError(`Exceeds ${CHARACTER_LIMITS.statement} character limit`);
    } else {
      setLieError('');
    }
  };

  // Form submission
  const onFormSubmit = async () => {
    // Final validation
    let hasErrors = false;

    if (!truth1Text.trim()) {
      setTruth1Error('Truth #1 is required');
      hasErrors = true;
    } else if (truth1Text.length > CHARACTER_LIMITS.statement) {
      setTruth1Error(`Exceeds ${CHARACTER_LIMITS.statement} character limit`);
      hasErrors = true;
    }

    if (!truth2Text.trim()) {
      setTruth2Error('Truth #2 is required');
      hasErrors = true;
    } else if (truth2Text.length > CHARACTER_LIMITS.statement) {
      setTruth2Error(`Exceeds ${CHARACTER_LIMITS.statement} character limit`);
      hasErrors = true;
    }

    if (!lieText.trim()) {
      setLieError('The lie is required');
      hasErrors = true;
    } else if (lieText.length > CHARACTER_LIMITS.statement) {
      setLieError(`Exceeds ${CHARACTER_LIMITS.statement} character limit`);
      hasErrors = true;
    }

    if (truth1DescriptionText.length > CHARACTER_LIMITS.description) {
      setTruth1DescriptionError(`Exceeds ${CHARACTER_LIMITS.description} character limit`);
      hasErrors = true;
    }

    if (truth2DescriptionText.length > CHARACTER_LIMITS.description) {
      setTruth2DescriptionError(`Exceeds ${CHARACTER_LIMITS.description} character limit`);
      hasErrors = true;
    }

    if (hasErrors) {
      onShowToast('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const truth1: Statement = {
        text: truth1Text.trim(),
        description: truth1DescriptionText.trim() || undefined,
      };
      const truth2: Statement = {
        text: truth2Text.trim(),
        description: truth2DescriptionText.trim() || undefined,
      };
      const lie: Statement = {
        text: lieText.trim(),
      };

      await onCreateGame(truth1, truth2, lie);
    } catch (error) {
      console.error('Error creating game:', error);
      onShowToast('Error creating game. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding="large" gap="medium" overflow="scroll">
        <CarnivalCard>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            Create two true statements and one convincing lie!
          </text>

          {/* Truth #1 */}
          <vstack gap="small">
            <hstack alignment="middle">
              <text weight="bold" color={CarnivalTheme.colors.text}>Truth #1 ✅</text>
              <spacer grow />
              <text size="small" color={truth1Text.length > CHARACTER_LIMITS.statement ? CarnivalTheme.colors.danger : CarnivalTheme.colors.textLight}>
                {truth1Text.length}/{CHARACTER_LIMITS.statement}
              </text>
            </hstack>
            <textinput
              value={truth1Text}
              onTextChange={handleTruth1Change}
              placeholder="Enter your first true statement"
              multiline
              disabled={isSubmitting}
            />
            {truth1Error && (
              <text size="small" color={CarnivalTheme.colors.danger}>{truth1Error}</text>
            )}
          </vstack>

          {/* Truth #1 Description */}
          <vstack gap="small">
            <hstack alignment="middle">
              <text weight="bold" color={CarnivalTheme.colors.text}>Truth #1 Details (Optional)</text>
              <spacer grow />
              <text size="small" color={truth1DescriptionText.length > CHARACTER_LIMITS.description ? CarnivalTheme.colors.danger : CarnivalTheme.colors.textLight}>
                {truth1DescriptionText.length}/{CHARACTER_LIMITS.description}
              </text>
            </hstack>
            <textinput
              value={truth1DescriptionText}
              onTextChange={handleTruth1DescriptionChange}
              placeholder="Add details to make it more believable"
              multiline
              disabled={isSubmitting}
            />
            {truth1DescriptionError && (
              <text size="small" color={CarnivalTheme.colors.danger}>{truth1DescriptionError}</text>
            )}
          </vstack>

          {/* Truth #2 */}
          <vstack gap="small">
            <hstack alignment="middle">
              <text weight="bold" color={CarnivalTheme.colors.text}>Truth #2 ✅</text>
              <spacer grow />
              <text size="small" color={truth2Text.length > CHARACTER_LIMITS.statement ? CarnivalTheme.colors.danger : CarnivalTheme.colors.textLight}>
                {truth2Text.length}/{CHARACTER_LIMITS.statement}
              </text>
            </hstack>
            <textinput
              value={truth2Text}
              onTextChange={handleTruth2Change}
              placeholder="Enter your second true statement"
              multiline
              disabled={isSubmitting}
            />
            {truth2Error && (
              <text size="small" color={CarnivalTheme.colors.danger}>{truth2Error}</text>
            )}
          </vstack>

          {/* Truth #2 Description */}
          <vstack gap="small">
            <hstack alignment="middle">
              <text weight="bold" color={CarnivalTheme.colors.text}>Truth #2 Details (Optional)</text>
              <spacer grow />
              <text size="small" color={truth2DescriptionText.length > CHARACTER_LIMITS.description ? CarnivalTheme.colors.danger : CarnivalTheme.colors.textLight}>
                {truth2DescriptionText.length}/{CHARACTER_LIMITS.description}
              </text>
            </hstack>
            <textinput
              value={truth2DescriptionText}
              onTextChange={handleTruth2DescriptionChange}
              placeholder="Add details to make it more believable"
              multiline
              disabled={isSubmitting}
            />
            {truth2DescriptionError && (
              <text size="small" color={CarnivalTheme.colors.danger}>{truth2DescriptionError}</text>
            )}
          </vstack>

          {/* The Lie */}
          <vstack gap="small">
            <hstack alignment="middle">
              <text weight="bold" color={CarnivalTheme.colors.text}>The Lie ❌</text>
              <spacer grow />
              <text size="small" color={lieText.length > CHARACTER_LIMITS.statement ? CarnivalTheme.colors.danger : CarnivalTheme.colors.textLight}>
                {lieText.length}/{CHARACTER_LIMITS.statement}
              </text>
            </hstack>
            <textinput
              value={lieText}
              onTextChange={handleLieChange}
              placeholder="Enter your convincing lie"
              multiline
              disabled={isSubmitting}
            />
            {lieError && (
              <text size="small" color={CarnivalTheme.colors.danger}>{lieError}</text>
            )}
          </vstack>

          {/* Action Buttons */}
          <hstack gap="medium">
            <button
              appearance="secondary"
              onPress={onBack}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              appearance="primary"
              onPress={onFormSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Game! 🎪'}
            </button>
          </hstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};