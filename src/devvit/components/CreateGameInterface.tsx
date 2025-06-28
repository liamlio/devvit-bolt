import { Devvit } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
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
    ui.showWebView({
      url: '/createGameForm/index.html',
      initialData: {
        postId,
        userId,
        authorUsername,
      },
      onMessage: async (message: any) => {
        if (message.type === 'CREATE_GAME_SUBMIT') {
          try {
            const { truth1, truth2, lie } = message.data;
            await onCreateGame(truth1, truth2, lie);
          } catch (error) {
            console.error('Error creating game from webview:', error);
            onShowToast('Error creating game. Please try again.');
          }
        }
      },
    });
  };

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" alignment="center middle" padding="large" overflow="scroll">
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
              Open Form 🎪
            </button>
          </hstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};