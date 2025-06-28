import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement } from '../../shared/types/game.js';

interface DescriptionViewInterfaceProps {
  statement: Statement;
  title: string;
  onBack: () => void;
}

export const DescriptionViewInterface = ({ 
  statement, 
  title, 
  onBack 
}: DescriptionViewInterfaceProps): JSX.Element => {
  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding="large" gap="medium">
        <CarnivalCard>
          <hstack alignment="middle">
            <button
              appearance="secondary"
              onPress={onBack}
            >
              ← Back
            </button>
            <spacer grow />
            <text size="large" weight="bold" color={CarnivalTheme.colors.text}>
              {title}
            </text>
            <spacer grow />
            <spacer width="60px" /> {/* Balance the back button */}
          </hstack>

          <vstack 
            padding="medium" 
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.success}
            gap="medium"
          >
            <text weight="bold" color={CarnivalTheme.colors.text} size="medium">
              Statement:
            </text>
            <text color={CarnivalTheme.colors.text} wrap>
              {statement.text}
            </text>

            {statement.description && (
              <>
                <text weight="bold" color={CarnivalTheme.colors.text} size="medium">
                  Details:
                </text>
                <text color={CarnivalTheme.colors.text} wrap>
                  {statement.description}
                </text>
              </>
            )}
          </vstack>

          <text size="small" color={CarnivalTheme.colors.textLight} alignment="center">
            💡 These details help explain why this statement is true!
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};