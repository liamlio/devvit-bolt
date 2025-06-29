import { Devvit, useWebView, Context, useAsync } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import type { Statement, GamePost as GamePostType } from '../../shared/types/game.js';
import { GameService } from '../service/GameService.js';

interface CreateGameInterfaceProps {
  context: Context;
  onBack: () => void;
  onShowToast: (message: string) => void;
  onCreateGame?: (truth1: Statement, truth2: Statement, lie: Statement) => Promise<void>;
}

export const CreateGameInterface = ({ 
  context,
  onBack, 
  onShowToast, 
  onCreateGame
}: CreateGameInterfaceProps): JSX.Element => {
  const { postId, userId, redis, reddit, ui } = context;
  const gameService = new GameService(redis);
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  // Check user's level to determine if they can create posts
  const { data: userLevelData, loading: levelLoading } = useAsync(async () => {
    if (!userId) return { canCreatePost: false, userLevel: 0, username: null };
    
    try {
      const userScore = await gameService.getUserScore(userId);
      const currentUser = reddit ? await reddit.getCurrentUser() : null;
      
      return {
        canCreatePost: userScore.level >= 1,
        userLevel: userScore.level,
        username: currentUser?.username || userScore.username || null,
        experienceNeeded: Math.max(0, 1 - userScore.experience),
      };
    } catch (error) {
      console.error('Error checking user level:', error);
      return { canCreatePost: false, userLevel: 0, username: null };
    }
  });

  const { mount, unmount, postMessage } = useWebView({
    url: 'index.html',
    onMessage: async (message, webView) => {
      console.log('Received message from webview:', message);
      
      if (message.type === 'webViewReady') {
        // Send initial data when webview signals it's ready
        console.log('Webview ready, sending initial data');
        
        let authorUsername = '';
        if (userId && reddit) {
          try {
            const user = await reddit.getCurrentUser();
            authorUsername = user?.username || '';
          } catch (err) {
            console.error('Error getting current user:', err);
          }
        }
        
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

    // Double-check user level before creating post
    const userScore = await gameService.getUserScore(userId);
    if (userScore.level < 1) {
      onShowToast('You must reach level 1 before creating posts. Play a game to earn XP!');
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

    // FIXED: Proper randomization that maintains statement integrity
    // Create array of statements in their original order
    const originalStatements = [truth1, truth2, lie];
    
    // Generate a random position for the lie (0, 1, or 2)
    const lieIndex = Math.floor(Math.random() * 3);
    
    // Create the shuffled array by placing statements in random positions
    const shuffledStatements = [null, null, null];
    
    // Place the lie at the random position
    shuffledStatements[lieIndex] = lie;
    
    // Fill remaining positions with truths
    let truthIndex = 0;
    for (let i = 0; i < 3; i++) {
      if (shuffledStatements[i] === null) {
        shuffledStatements[i] = truthIndex === 0 ? truth1 : truth2;
        truthIndex++;
      }
    }
    
    const gamePost: GamePostType = {
      postId: post.id,
      authorId: userId,
      authorUsername: user.username,
      // Keep original statements in their designated fields
      truth1,
      truth2,
      lie,
      // lieIndex now correctly indicates where the lie appears in the game
      lieIndex,
      createdAt: Date.now(),
      totalGuesses: 0,
      correctGuesses: 0,
      guessBreakdown: [0, 0, 0],
    };

    await gameService.createGamePost(gamePost);
    await gameService.setPostType(post.id, 'game');

    // Update user flair when they create their first post
    const gameSettings = await gameService.getGameSettings();
    if (gameSettings.subredditName) {
      await gameService.updateUserFlair(user.username, gameSettings.subredditName, reddit);
    }

    console.log('Game post created successfully, closing webview and redirecting');
    
    // Close webview and redirect to new post
    webView.unmount();
    ui.showToast('Game post created successfully! 🎪');
    ui.navigateTo(post.url);
  };

  const handleOpenWebview = async () => {
    try {
      console.log('Opening webview with data:', { postId, userId });
      
      // Mount the webview (this opens it)
      mount();
    } catch (error) {
      console.error('Error opening webview:', error);
      onShowToast('Error opening form. Please try again.');
    }
  };

  // Show loading state while checking user level
  if (levelLoading) {
    return (
      <CarnivalBackground>
        <vstack 
          width="100%" 
          height="100%" 
          padding={isSmallScreen ? "medium" : "large"} 
          gap="small"
          alignment="center middle"
        >
          <CarnivalCard padding={isSmallScreen ? "medium" : "medium"}>
            <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪</text>
            <text alignment="center" color={CarnivalTheme.colors.text}>
              Checking your level...
            </text>
          </CarnivalCard>
        </vstack>
      </CarnivalBackground>
    );
  }

  // Show level requirement message for level 0 users
  if (userLevelData && !userLevelData.canCreatePost) {
    const levelInfo = gameService.getLevelByExperience(0); // Get level 0 info
    const nextLevelInfo = gameService.getLevelByExperience(1); // Get level 1 info
    
    return (
      <CarnivalBackground>
        <vstack 
          width="100%" 
          height="100%" 
          padding={isSmallScreen ? "medium" : "large"} 
          gap="small"
          alignment={isSmallScreen ? "center top" : "center middle"}
        >
          <CarnivalCard padding={isSmallScreen ? "medium" : "large"} borderColor={CarnivalTheme.colors.warning}>
            <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🤡</text>
            <text size={isSmallScreen ? "large" : "xxlarge"} alignment="center" color={CarnivalTheme.colors.text}>
              Level Up Required!
            </text>
            
            <vstack 
              padding="medium"
              backgroundColor="rgba(255, 165, 0, 0.1)" 
              cornerRadius="medium"
              border="thin"
              borderColor={CarnivalTheme.colors.warning}
              gap="small"
            >
              <text alignment="center" color={CarnivalTheme.colors.text}>
                You are currently Level {userLevelData.userLevel}: {levelInfo.name}
              </text>
              <text alignment="center" color={CarnivalTheme.colors.text}>
                You need to reach Level 1: {nextLevelInfo.name} before you can create posts.
              </text>
            </vstack>

            <vstack gap="small">
              <text size="medium" weight="bold" alignment="center" color={CarnivalTheme.colors.text}>
                🎯 How to Level Up:
              </text>
              <vstack 
                padding="medium"
                backgroundColor={CarnivalTheme.colors.background} 
                cornerRadius="medium"
                gap="small"
              >
                <text alignment="center" color={CarnivalTheme.colors.text}>
                  Play 1 game to earn 1 XP and reach Level 1!
                </text>
                <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
                  • Participate in any Two Truths One Lie game (+1 XP)
                </text>
                <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
                  • Guess correctly for bonus XP (+2 XP total)
                </text>
              </vstack>
            </vstack>

            <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
              💡 Find existing games in the community to start playing!
            </text>
            
            {/* Responsive button layout */}
            {isSmallScreen ? (
              <vstack gap="medium" alignment="center">
                <button
                  appearance="secondary"
                  onPress={onBack}
                  width="100%"
                >
                  Back to Hub
                </button>
              </vstack>
            ) : (
              <hstack gap="medium" alignment="center">
                <button
                  appearance="secondary"
                  onPress={onBack}
                >
                  Back to Hub
                </button>
              </hstack>
            )}
          </CarnivalCard>
        </vstack>
      </CarnivalBackground>
    );
  }

  // Show create game interface for level 1+ users
  return (
    <CarnivalBackground>
      <vstack 
        width="100%" 
        height="100%" 
        padding={isSmallScreen ? "medium" : "large"} 
        gap="small"
        alignment={isSmallScreen ? "center top" : "center middle"}
      >
        <CarnivalCard padding={isSmallScreen ? "medium" : "medium"}>
          <text size="xxlarge" alignment="center" color={CarnivalTheme.colors.text}>🎪 Create Your Game</text>
          <text alignment="center" color={CarnivalTheme.colors.text}>
            Ready to create your Two Truths One Lie game?
          </text>
          
          {userLevelData?.username && (
            <text size="small" alignment="center" color={CarnivalTheme.colors.textLight}>
              Creating as: u/{userLevelData.username} • Level {userLevelData.userLevel}
            </text>
          )}
          
          {/* Responsive button layout */}
          {isSmallScreen ? (
            <vstack gap="medium" alignment="center">
              <button
                appearance="primary"
                onPress={handleOpenWebview}
                width="100%"
              >
                Create Post 🎪
              </button>
               <button
                appearance="secondary"
                onPress={onBack}
                width="100%"
              >
                Back
              </button>
            </vstack>
          ) : (
            <hstack gap="medium" alignment="center">
              <button
                appearance="primary"
                onPress={handleOpenWebview}
              >
                Create Post 🎪
              </button>
              <button
                appearance="secondary"
                onPress={onBack}
              >
                Back
              </button>
            </hstack>
          )}
        </CarnivalCard>

        {/* MOVED: Tips section now appears below the main create game card */}
        <CarnivalCard padding={isSmallScreen ? "medium" : "medium"} borderColor={CarnivalTheme.colors.accent}>
          <text size="medium" weight="bold" alignment="center" color={CarnivalTheme.colors.text}>
            💡 Tips for Creating Viral Games
          </text>
          <vstack gap="small">
            <text size="small" color={CarnivalTheme.colors.text}>
              • Create truths with HUGE shock factors - the more unbelievable but true, the better!
            </text>
            <text size="small" color={CarnivalTheme.colors.text}>
              • Make your lie sound completely plausible and boring
            </text>
            <text size="small" color={CarnivalTheme.colors.text}>
              • Use wild, jaw-dropping details in your truth descriptions to maximize engagement
            </text>
            <text size="small" color={CarnivalTheme.colors.text}>
              • Think: "What would make people say 'NO WAY that's true!'"
            </text>
            <text size="small" color={CarnivalTheme.colors.accent}>
              • Bonus: Posts with 5+ guesses earn you +10 XP!
            </text>
          </vstack>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};