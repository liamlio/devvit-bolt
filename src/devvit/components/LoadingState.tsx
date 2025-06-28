import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';

export const LoadingState = (): JSX.Element => (
  <CarnivalBackground>
    <vstack width="100%" height="100%" alignment="center middle" padding="large">
      <CarnivalCard>
        <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪</text>
        <text size="large" weight="bold" color={CarnivalTheme.colors.text} alignment="center">
          Loading Two Truths One Lie...
        </text>
      </CarnivalCard>
    </vstack>
  </CarnivalBackground>
);