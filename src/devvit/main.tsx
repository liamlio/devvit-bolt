import { Devvit } from '@devvit/public-api';
import { Router } from './posts/Router.js';
import { GameService } from './service/GameService.js';

// Configure Devvit with userActions enabled
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
  userActions: true, // Enable posting as user
});

// Add the custom post type
Devvit.addCustomPostType({
  name: 'ttol',
  height: 'tall',
  render: (context) => {
    const { postId, userId, redis, reddit, ui } = context;
    
    return (
      <Router 
        postId={postId} 
        userId={userId} 
        redis={redis} 
        reddit={reddit} 
        ui={ui} 
      />
    );
  },
});

// Menu item for creating new posts
Devvit.addMenuItem({
  label: '[TTOL] New Two Truths One Lie Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Can You Spot the Lie? 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🎪</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Ready to create your game...</text>
            </vstack>
          </blocks>
        ),
        runAs: 'USER', // Post as the user, not the app
        userGeneratedContent: {
          text: 'Two Truths One Lie game post created by user'
        },
      });
      
      await gameService.setPostType(post.id, 'game');
      
      ui.showToast({ text: 'Created Two Truths One Lie post! Click on it to configure your game.' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error creating post:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error creating post!',
      });
    }
  },
});

// Menu item for installing the game
Devvit.addMenuItem({
  label: '[TTOL] Install Game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui, redis } = context;
    
    try {
      const gameService = new GameService(redis);
      const subreddit = await reddit.getCurrentSubreddit();
      
      const post = await reddit.submitPost({
        title: '🎪 Two Truths One Lie - Community Hub 🎪',
        subredditName: subreddit.name,
        customPostType: 'ttol',
        preview: (
          <blocks>
            <vstack alignment="center middle" padding="large">
              <text size="xxlarge">🏆</text>
              <text size="large" weight="bold">Two Truths One Lie</text>
              <text color="neutral-content-weak">Community Hub</text>
            </vstack>
          </blocks>
        ),
        runAs: 'USER', // Post as the user, not the app
        userGeneratedContent: {
          text: 'Two Truths One Lie community hub created by moderator'
        },
      });
      
      await Promise.all([
        post.sticky(),
        gameService.setPinnedPost(post.id),
        gameService.setPostType(post.id, 'pinned'),
        gameService.setGameSettings({ subredditName: subreddit.name }),
      ]);
      
      ui.showToast({ text: 'Installed Two Truths One Lie!' });
      ui.navigateTo(post.url);
    } catch (error) {
      console.error('Error installing game:', error);
      ui.showToast({
        text: error instanceof Error ? `Error: ${error.message}` : 'Error installing game!',
      });
    }
  },
});

// Handle webview messages
Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
    // Handle webview form submissions here if needed
    console.log('Post submitted:', event);
  },
});

export default Devvit;