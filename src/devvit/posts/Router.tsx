import { Devvit, useAsync } from '@devvit/public-api';
import { GameService } from '../service/GameService.js';
import { LoadingState } from '../components/LoadingState.js';
import { ErrorState } from '../components/ErrorState.js';
import { GamePost } from './GamePost.js';
import { PinnedPost } from './PinnedPost.js';
import { CarnivalBackground } from '../components/CarnivalBackground.js';

interface RouterProps {
  postId: string;
  userId?: string;
  redis: any;
  reddit?: any;
  ui: any;
}

export const Router = ({ postId, userId, redis, reddit, ui }: RouterProps): JSX.Element => {
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
    ? <PinnedPost postId={postId} userId={userId} redis={redis} reddit={reddit} ui={ui} />
    : <GamePost postId={postId} userId={userId} redis={redis} reddit={reddit} ui={ui} />;

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