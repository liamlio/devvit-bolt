import { Devvit, Context, useAsync } from '@devvit/public-api';
import { CarnivalBackground } from './CarnivalBackground.js';
import { CarnivalCard } from './CarnivalCard.js';
import { CarnivalTheme } from './CarnivalTheme.js';
import { GameService } from '../service/GameService.js';
import type { GamePost, Statement, UserGuess } from '../../shared/types/game.js';

interface GameResultsInterfaceProps {
  context: Context;
  gamePost: GamePost;
  userGuess?: UserGuess;
  onViewDescription: (statement: Statement, title: string) => void;
  // TESTING EXCEPTION: Optional back button for u/liamlio testing
  showBackButton?: boolean;
  onBackToGuessing?: () => void;
}

export const GameResultsInterface = ({ 
  context,
  gamePost, 
  userGuess, 
  onViewDescription,
  showBackButton = false,
  onBackToGuessing
}: GameResultsInterfaceProps): JSX.Element => {
  const { redis, ui } = context;
  const gameService = new GameService(redis);
  
  // FIXED: Create the statements array in the same order as displayed in GamePlayInterface
  const statements: Statement[] = [null, null, null];
  
  // Place the lie at the correct position
  statements[gamePost.lieIndex] = gamePost.lie;
  
  // Fill remaining positions with truths
  let truthIndex = 0;
  for (let i = 0; i < 3; i++) {
    if (statements[i] === null) {
      statements[i] = truthIndex === 0 ? gamePost.truth1 : gamePost.truth2;
      truthIndex++;
    }
  }
  
  // Get screen width for responsive design
  const width = context.dimensions?.width || 400;
  const isSmallScreen = width < 450;

  // Get pinned post ID for "Return to Hub" functionality
  const { data: pinnedPostId } = useAsync(async () => {
    try {
      return await gameService.getPinnedPost();
    } catch (error) {
      console.error('Error getting pinned post:', error);
      return null;
    }
  });

  // Handle navigation to leaderboard (pinned post)
  const handleViewLeaderboard = async () => {
    try {
      if (pinnedPostId) {
        const post = await context.reddit?.getPostById(pinnedPostId);
        if (post) {
          ui.navigateTo(post.url);
          return;
        }
      }
      
      // Fallback: show toast if pinned post not found
      ui.showToast('Leaderboard not found. Please check the community hub.');
    } catch (error) {
      console.error('Error navigating to leaderboard:', error);
      ui.showToast('Error navigating to leaderboard. Please try again.');
    }
  };

  // Handle navigation to hub (same as leaderboard)
  const handleReturnToHub = async () => {
    try {
      if (pinnedPostId) {
        const post = await context.reddit?.getPostById(pinnedPostId);
        if (post) {
          ui.navigateTo(post.url);
          return;
        }
      }
      
      // Fallback: show toast if pinned post not found
      ui.showToast('Community hub not found. Please check for the pinned post.');
    } catch (error) {
      console.error('Error navigating to hub:', error);
      ui.showToast('Error navigating to hub. Please try again.');
    }
  };

  // Handle navigation to create post interface
  const handleCreatePost = async () => {
    try {
      if (pinnedPostId) {
        const post = await context.reddit?.getPostById(pinnedPostId);
        if (post) {
          // Navigate to the hub post, which will show the create game interface
          ui.navigateTo(post.url);
          // Show a toast to guide the user
          ui.showToast('Click "Create a Game" in the hub to make a new post! 🎪');
          return;
        }
      }
      
      // Fallback: show toast if pinned post not found
      ui.showToast('Please visit the community hub to create a new post.');
    } catch (error) {
      console.error('Error navigating to create post:', error);
      ui.showToast('Error navigating to create post. Please try again.');
    }
  };

  return (
    <CarnivalBackground>
      <vstack width="100%" height="100%" padding={isSmallScreen ? "small" : "medium"} gap="small">
        <CarnivalCard padding="small">
          <vstack width="100%" height="100%" padding="xxsmall" gap="xxsmall">
          <text size={isSmallScreen ? "large" : "xxlarge"} alignment="center" color={CarnivalTheme.colors.text}>🎪 Results</text>
          <text size={isSmallScreen ? "small" : "medium"} alignment="center" color={CarnivalTheme.colors.text}>
            {userGuess?.isCorrect 
              ? '🎉 Congratulations! You spotted the lie!' 
              : '😅 Nice try! Better luck next time!'
            }
          </text>
          <text size={isSmallScreen ? "xsmall" : "small"} alignment="center" color={CarnivalTheme.colors.textLight}>
            By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} {gamePost.totalGuesses !== 1 ? 'have' : 'has'} guessed
          </text>
          </vstack>

          <vstack gap="xxsmall" padding="xxsmall">
            {statements.map((statement, index) => {
              const isLie = index === gamePost.lieIndex;
              const isUserChoice = userGuess?.guessIndex === index;
              const votes = gamePost.guessBreakdown[index];
              const percentage = gamePost.totalGuesses > 0 
                ? Math.round((votes / gamePost.totalGuesses) * 100) 
                : 0;

              // Determine the title for the description view based on the original statement
              let descriptionTitle = '';
              if (statement === gamePost.truth1) descriptionTitle = 'Truth #1 Details';
              else if (statement === gamePost.truth2) descriptionTitle = 'Truth #2 Details';

              return (
                <vstack 
                  key={index} 
                  padding={isSmallScreen ? "xsmall" : "small"}
                  backgroundColor={isLie ? "rgba(255,68,68,0.2)" : "rgba(50,205,50,0.2)"} 
                  cornerRadius="medium"
                  border="thick"
                  borderColor={isLie ? CarnivalTheme.colors.danger : CarnivalTheme.colors.success}
                  gap="small"
                >
                  <hstack alignment="middle">
                    <text grow size={isSmallScreen ? "small" : "medium"} weight="bold" color={CarnivalTheme.colors.text} wrap>
                      {isLie ? '❌ LIE' : '✅ TRUTH'}: {statement.text}
                    </text>
                    <vstack gap="xxsmall" alignment="end">
                      {isUserChoice && (
                        <text color={CarnivalTheme.colors.primary} weight="bold" size={isSmallScreen ? "xsmall" : "small"}>
                          (Your choice)
                        </text>
                      )}
                      <text size={isSmallScreen ? "xsmall" : "small"} color={CarnivalTheme.colors.textLight}>
                        {votes} vote{votes !== 1 ? 's' : ''} ({percentage}%)
                      </text>
                    </vstack>
                  </hstack>
                  
                  {/* Show expand button for truths with descriptions */}
                  {!isLie && statement.description && (
                    <button
                      appearance="secondary"
                      size="small"
                      onPress={() => onViewDescription(statement, descriptionTitle)}
                      width={isSmallScreen ? "100%" : undefined}
                    >
                      📖 Expand Description
                    </button>
                  )}
                </vstack>
              );
            })}
          </vstack>

          {/* UPDATED: Navigation buttons with responsive layout */}
          {isSmallScreen ? (
            <vstack gap="small" alignment="center" padding="xxsmall">
              {/* TESTING EXCEPTION: Back button only for u/liamlio */}
              {showBackButton && onBackToGuessing && (
                <button
                  appearance="destructive"
                  onPress={onBackToGuessing}
                  width="100%"
                  size="small"
                >
                  🔄 Test Again (liamlio only)
                </button>
              )}
              
              {/* NEW: Navigation buttons */}
              <hstack gap="small" width="100%">
                <button
                  appearance="secondary"
                  onPress={handleReturnToHub}
                  grow
                  size="small"
                >
                  🏠 Return to Hub
                </button>
                <button
                  appearance="primary"
                  onPress={handleCreatePost}
                  grow
                  size="small"
                >
                  ➕ Create Post
                </button>
              </hstack>
              
              <button
                appearance="secondary"
                onPress={handleViewLeaderboard}
                width="100%"
                size="small"
              >
                🏆 View Leaderboard
              </button>
            </vstack>
          ) : (
            <vstack gap="small" alignment="center" padding="xxsmall">
              {/* TESTING EXCEPTION: Back button only for u/liamlio */}
              {showBackButton && onBackToGuessing && (
                <button
                  appearance="destructive"
                  onPress={onBackToGuessing}
                  size="small"
                >
                  🔄 Test Again (liamlio only)
                </button>
              )}
              
              {/* NEW: Navigation buttons in horizontal layout for larger screens */}
              <hstack gap="medium" alignment="center">
                <button
                  appearance="secondary"
                  onPress={handleReturnToHub}
                  size="small"
                >
                  🏠 Return to Hub
                </button>
                <button
                  appearance="primary"
                  onPress={handleCreatePost}
                  size="small"
                >
                  ➕ Create Post
                </button>
                <button
                  appearance="secondary"
                  onPress={handleViewLeaderboard}
                  size="small"
                >
                  🏆 View Leaderboard
                </button>
              </hstack>
            </vstack>
          )}
          
          <text size={isSmallScreen ? "xsmall" : "small"} alignment="center" color={CarnivalTheme.colors.text}>
            💬 How surprising were the truths? Comment below!
          </text>
        </CarnivalCard>
      </vstack>
    </CarnivalBackground>
  );
};