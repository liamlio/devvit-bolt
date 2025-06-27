import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState = ({ error, onRetry }: ErrorStateProps): JSX.Element => (
  <blocks height="tall">
    <CarnivalBackground>
      <vstack width="100%" height="100%" alignment="center middle" padding="large">
        <CarnivalCard borderColor={CarnivalTheme.colors.danger}>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>⚠️</text>
          <text size="large" weight="bold" color={CarnivalTheme.colors.danger} alignment="center">
            Error Loading Game
          </text>
          <text color={CarnivalTheme.colors.text} alignment="center">
            {error || 'Something went wrong. Please try again.'}
          </text>
          <button
            appearance="destructive"
            onPress={onRetry}
          >
            Retry
          </button>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  </blocks>
);