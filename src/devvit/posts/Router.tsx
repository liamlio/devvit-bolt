import { Devvit, useAsync, Context } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { GamePost } from './GamePost.js';
import { PinnedPost } from './PinnedPost.js';
import { CarnivalBackground } from '../components/CarnivalBackground.js';

interface RouterProps {
  context: Context;
}

export const Router = ({ context }: RouterProps): JSX.Element => {
  const { postId, userId, redis, reddit, ui } = context;
  const gameService = new GameService(redis);

  // Determine post type
  const { data: postType, loading } = useAsync(async () => {
    try {
      let type = await gameService.getPostType(postId);
      
      if (!type) {
        const pinnedPostId = await gameService.getPinnedPost();
        if (pinnedPostId === postId) {
          type = 'pinned';
          await gameService.setPostType(postId, 'pinned');
        } else {
          type = 'game';
          await gameService.setPostType(postId, 'game');
        }
      }
      
      return type;
    } catch (err) {
      console.error('Error determining post type:', err);
      throw err;
    }
  }, [postId]);

  // Handle loading state
  if (loading) {
    return <LoadingState />;
  }

  // Handle error state
  if (!postType) {
    return (
      <ErrorState 
        error="Failed to determine post type" 
        onRetry={() => {
          window.location.reload();
        }} 
      />
    );
  }

  // Route to appropriate component with scrollable content layer
  const content = postType === 'pinned' 
    ? <PinnedPost context={context} />
    : <GamePost context={context} />;

  return (
    <blocks height="tall">
      <CarnivalBackground>
        <vstack width="100%" height="100%" overflow="scroll">
          {content}
        </vstack>
      </CarnivalBackground>
    </blocks>
  );
};