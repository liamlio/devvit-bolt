import { Devvit } from '@devvit/public-api';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement } from '../../shared/types/game.js';

interface CreateGameInterfaceProps {
  onBack: () => void;
  onShowToast: (message: string) => void;
  onCreateGame: (truth1: Statement, truth2: Statement, lie: Statement) => Promise<void>;
  ui: any;
  postId: string;
  userId?: string;
  authorUsername?: string;
}

export const CreateGameInterface = ({ 
  onBack, 
  onShowToast, 
  onCreateGame, 
  ui,
  postId,
  userId,
  authorUsername
}: CreateGameInterfaceProps): JSX.Element => {

  const handleOpenWebview = () => {
    try {
      ui.webView.postMessage('devvit-message', {
        type: 'webview',
        data: {
          url: 'createGameForm/index.html',
          initialData: {
            postId,
            userId,
            authorUsername,
          },
        },
      });
    } catch (error) {
      console.error('Error opening webview:', error);
      onShowToast('Error opening form. Please try again.');
    }
  };

  return (
    <vstack width="100%" height="100%" alignment="center middle" padding="large">
      <CarnivalCard>
        <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
        <text alignment="center" color={CarnivalTheme.colors.text}>
          Ready to create your Two Truths One Lie game? Use our enhanced form with real-time character counting!
        </text>
        
        <vstack 
          padding="medium" 
          backgroundColor={CarnivalTheme.colors.background} 
          cornerRadius="medium"
          border="thin"
          borderColor={CarnivalTheme.colors.primary}
          gap="small"
        >
          <text weight="bold" color={CarnivalTheme.colors.text}>✨ Enhanced Form Features:</text>
          <text size="small" color={CarnivalTheme.colors.textLight}>
            • Real-time character counting
          </text>
          <text size="small" color={CarnivalTheme.colors.textLight}>
            • Instant validation feedback
          </text>
          <text size="small" color={CarnivalTheme.colors.textLight}>
            • Better text editing experience
          </text>
          <text size="small" color={CarnivalTheme.colors.textLight}>
            • Your text is preserved if you need to make edits
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
            onPress={handleOpenWebview}
          >
            Create Post 🎪
          </button>
        </hstack>
      </CarnivalCard>
    </vstack>
  );
};