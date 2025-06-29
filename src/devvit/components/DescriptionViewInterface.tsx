import { Devvit, Context } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement } from '../../shared/types/game.js';

interface DescriptionViewInterfaceProps {
  context: Context;
  statement: Statement;
  title: string;
  onBack: () => void;
}

export const DescriptionViewInterface = ({ 
  context,
  statement, 
  title, 
  onBack 
}: DescriptionViewInterfaceProps): JSX.Element => {
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding={isSmallScreen ? "medium" : "large"} gap="medium">
        <CarnivalCard padding={isSmallScreen ? "medium" : "large"}>
          <hstack alignment="middle">
            <button
              appearance="secondary"
              onPress={onBack}
              size={isSmallScreen ? "small" : "medium"}
            >
              ← Back
            </button>
            {!isSmallScreen && <spacer grow />}
            <text size={isSmallScreen ? "medium" : "large"} weight="bold" color={CarnivalTheme.colors.text}>
              {title}
            </text>
            {!isSmallScreen && <spacer grow />}
            {!isSmallScreen && <spacer width="60px" />} {/* Balance the back button on larger screens */}
          </hstack>

          <vstack 
            padding={isSmallScreen ? "medium" : "large"}
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.success}
            gap="medium"
          >
            <text color={CarnivalTheme.colors.text} wrap size={isSmallScreen ? "small" : "medium"}>
              {statement.description}
            </text>
          </vstack>

          <text size={isSmallScreen ? "xsmall" : "small"} color={CarnivalTheme.colors.textLight} alignment="center">
            💡 These details help explain why this statement is true!
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};