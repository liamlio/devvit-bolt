import { Devvit, useWebView } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement, GamePost as GamePostType } from '../../shared/types/game.js';
import { GameService } from '../service/GameService.js';

interface CreateGameInterfaceProps {
  onBack: () => void;
  onShowToast: (message: string) => void;
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
          console.log('Processing game creation:', message.data);
          const { truth1, truth2, lie } = message.data;
          
          // Always create a new post
          if (redis && reddit && userId) {
            const gameService = new GameService(redis);
            console.log('Creating new post');
            await createNewGamePost(truth1, truth2, lie, gameService, reddit, userId, ui, webView);
          } else {
            console.log('Missing required dependencies for new post creation');
            webView.unmount();
            onShowToast('Error: Missing required information to create post');
          }
        } catch (error) {
          console.error('Error creating game:', error);
          onShowToast('Error creating game. Please try again.');
          webView.unmount();
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
    console.log('Creating new game post...');
    
    const user = await reddit.getCurrentUser();
    if (!user) {
      onShowToast('Unable to get user information');
      webView.unmount();
      return;
    }

    const userScore = await gameService.getUserScore(userId);
    if (userScore.level < 1 && userScore.experience < 1) {
      onShowToast('You must reach level 1 by playing at least one game before creating your own post');
      webView.unmount();
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

    console.log('Game post created successfully, closing webview and redirecting');
    
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
      <vstack width="100%" height="100%" padding="xlarge" gap="small">
        <CarnivalCard padding="small">
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            Ready to create your Two Truths One Lie game? Use our enhanced form with real-time character counting!
          </text>
          
          {/* <vstack 
            key="0"
            backgroundColor={CarnivalTheme.colors.background} 
            cornerRadius="medium"
            border="thin"
            borderColor={CarnivalTheme.colors.primary}
            gap="medium"
          >
            <text weight="bold" color={CarnivalTheme.colors.text}>✨ Enhanced Form Features:</text>
            <text size="small" color={CarnivalTheme.colors.textLight}>
              • Real-time character counting (150 char limit for statements)
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
          </vstack> */}
          
          <hstack gap="medium" alignment="center">
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