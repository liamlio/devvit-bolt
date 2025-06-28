import { Devvit, useWebView } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement, GamePost as GamePostType } from '../../shared/types/game.js';
import { GameService } from '../service/GameService.js';

interface CreateGameInterfaceProps {
  onBack: () => void;
  onShowToast: (message: string) => void;
  onCreateGame: (truth1: Statement, truth2: Statement, lie: Statement) => Promise<void>;
  ui: any;
  postId: string;
  userId?: string;
  authorUsername?: string;
  redis?: any;
  reddit?: any;
}

export const CreateGameInterface = ({ 
  onBack, 
  onShowToast, 
  onCreateGame, 
  ui,
  postId,
  userId,
  authorUsername,
  redis,
  reddit
}: CreateGameInterfaceProps): JSX.Element => {

  const { mount, unmount, postMessage } = useWebView({
    url: 'index.html',
    onMessage: async (message, webView) => {
      console.log('Received message from webview:', message);
      
      if (message.type === 'webViewReady') {
        // Send initial data when webview signals it's ready
        console.log('Webview ready, sending initial data');
        webView.postMessage({
          type: 'INIT_DATA',
          data: {
            postId,
            userId,
            authorUsername,
          },
        });
      } else if (message.type === 'CREATE_GAME_SUBMIT') {
        try {
          const { truth1, truth2, lie } = message.data;
          
          // If this is being called from the pinned post, create a new post
          // If this is being called from an existing post, just configure it
          if (redis && reddit && userId) {
            const gameService = new GameService(redis);
            const pinnedPostId = await gameService.getPinnedPost();
            
            if (postId === pinnedPostId) {
              // We're in the pinned post - create a new post
              await createNewGamePost(truth1, truth2, lie, gameService, reddit, userId, ui, webView);
            } else {
              // We're in an existing post - configure it
              await onCreateGame(truth1, truth2, lie);
              webView.unmount();
              onShowToast('Game created successfully! 🎪');
            }
          } else {
            // Fallback to the original method
            await onCreateGame(truth1, truth2, lie);
            webView.unmount();
            onShowToast('Game created successfully! 🎪');
          }
        } catch (error) {
          console.error('Error creating game:', error);
          onShowToast('Error creating game. Please try again.');
        }
      }
    },
    onUnmount: () => {
      console.log('Webview closed');
    },
  });

  const createNewGamePost = async (
    truth1: Statement, 
    truth2: Statement, 
    lie: Statement,
    gameService: GameService,
    reddit: any,
    userId: string,
    ui: any,
    webView: any
  ) => {
    const user = await reddit.getCurrentUser();
    if (!user) {
      onShowToast('Unable to get user information');
      return;
    }

    const userScore = await gameService.getUserScore(userId);
    if (userScore.level < 1 && userScore.experience < 1) {
      onShowToast('You must reach level 1 by playing at least one game before creating your own post');
      return;
    }

    const subreddit = await reddit.getCurrentSubreddit();
    
    // Create a new post by the user, not the app
    const post = await reddit.submitPost({
      title: '🎪 Two Truths One Lie - Can You Spot the Lie? 🎪',
      subredditName: subreddit.name,
      customPostType: 'ttol',
      preview: (
        <blocks>
          <vstack alignment="center middle" padding="large">
            <text size="xxlarge">🎪</text>
            <text size="large" weight="bold">Two Truths One Lie</text>
            <text color="neutral-content-weak">Ready to play...</text>
          </vstack>
        </blocks>
      ),
      runAs: 'USER', // Post as the user, not the app
      userGeneratedContent: {
        text: `Two Truths One Lie game: "${truth1.text}", "${truth2.text}", "${lie.text}"`
      },
    });

    const lieIndex = Math.floor(Math.random() * 3);
    
    const gamePost: GamePostType = {
      postId: post.id,
      authorId: userId,
      authorUsername: user.username,
      truth1,
      truth2,
      lie,
      lieIndex,
      createdAt: Date.now(),
      totalGuesses: 0,
      correctGuesses: 0,
      guessBreakdown: [0, 0, 0],
    };

    await gameService.createGamePost(gamePost);
    await gameService.setPostType(post.id, 'game');

    // Close webview and redirect to new post
    webView.unmount();
    ui.showToast('Game post created successfully! 🎪');
    ui.navigateTo(post.url);
  };

  const handleOpenWebview = async () => {
    try {
      console.log('Opening webview with data:', { postId, userId, authorUsername });
      
      // Mount the webview (this opens it)
      mount();
    } catch (error) {
      console.error('Error opening webview:', error);
      onShowToast('Error opening form. Please try again.');
    }
  };

  return (
    <CarnivalBackground>
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
    </CarnivalBackground>
  );
};