import { Devvit } from '@devvit/public-api';
import { CarnivalTheme } from './CarnivalTheme.js';

interface CarnivalCardProps {
  children: JSX.Element | JSX.Element[];
  borderColor?: string;
  padding?: 'none' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
}

export const CarnivalCard = ({ 
  children, 
  borderColor = CarnivalTheme.colors.shadow,
  padding = 'large'
}: CarnivalCardProps): JSX.Element => (
  <vstack 
    backgroundColor="rgba(255,255,255,0.95)" 
    cornerRadius="large" 
    padding={padding}
    border="thick"
    borderColor={borderColor}
    gap="medium"
  >
    {children}
  </vstack>
);