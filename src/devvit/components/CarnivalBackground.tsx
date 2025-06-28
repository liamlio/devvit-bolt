import { Devvit } from '@devvit/public-api';
import { createCarnivalBackground } from './CarnivalTheme.js';

interface CarnivalBackgroundProps {
  children: JSX.Element | JSX.Element[];
}

export const CarnivalBackground = ({ children }: CarnivalBackgroundProps): JSX.Element => (
  <zstack width="100%" height="100%">
    <image
      url={createCarnivalBackground()}
      imageHeight={400}
      imageWidth={400}
      height="100%"
      width="100%"
      resizeMode="cover"
      description="Carnival striped background with diagonal blue stripes and noise texture"
    />
    {children}
  </zstack>
);