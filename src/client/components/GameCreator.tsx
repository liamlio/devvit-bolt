import React, { useState } from 'react';
import { CarnivalButton } from './CarnivalButton';
import type { Statement, CreateGameRequest } from '../../shared/types/game';

interface GameCreatorProps {
  onCreateGame: (gameData: CreateGameRequest) => Promise<void>;
  onBack: () => void;
}

export const GameCreator: React.FC<GameCreatorProps> = ({ onCreateGame, onBack }) => {
  const [truth1, setTruth1] = useState<Statement>({ text: '', description: '' });
  const [truth2, setTruth2] = useState<Statement>({ text: '', description: '' });
  const [lie, setLie] = useState<Statement>({ text: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!truth1.text.trim() || !truth2.text.trim() || !lie.text.trim()) {
      setError('All statements are required');
      return;
    }

    if (truth1.text.length > 200 || truth2.text.length > 200 || lie.text.length > 200) {
      setError('Statements must be 200 characters or less');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateGame({ truth1, truth2, lie });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border-4 border-gray-300 p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎪 Create Your Game</h1>
          <p className="text-gray-600">
            Create two true statements and one lie. Players will try to guess which statement is false!
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Truth 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Truth #1 ✅
            </label>
            <textarea
              value={truth1.text}
              onChange={(e) => setTruth1({ ...truth1, text: e.target.value })}
              placeholder="Enter your first true statement..."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              maxLength={200}
              required
            />
            <div className="mt-2">
              <input
                type="text"
                value={truth1.description || ''}
                onChange={(e) => setTruth1({ ...truth1, description: e.target.value })}
                placeholder="Optional: Add details to make it more believable..."
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm"
                maxLength={100}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {truth1.text.length}/200 characters
            </div>
          </div>

          {/* Truth 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Truth #2 ✅
            </label>
            <textarea
              value={truth2.text}
              onChange={(e) => setTruth2({ ...truth2, text: e.target.value })}
              placeholder="Enter your second true statement..."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              maxLength={200}
              required
            />
            <div className="mt-2">
              <input
                type="text"
                value={truth2.description || ''}
                onChange={(e) => setTruth2({ ...truth2, description: e.target.value })}
                placeholder="Optional: Add details to make it more believable..."
                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm"
                maxLength={100}
              />
            </div>
            <div className="text-right text-xs text-gray-500 mt-1">
              {truth2.text.length}/200 characters
            </div>
          </div>

          {/* Lie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              The Lie ❌
            </label>
            <textarea
              value={lie.text}
              onChange={(e) => setLie({ ...lie, text: e.target.value })}
              placeholder="Enter your convincing lie..."
              className="w-full p-3 border-2 border-red-300 rounded-lg focus:border-red-500 focus:outline-none resize-none"
              rows={3}
              maxLength={200}
              required
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {lie.text.length}/200 characters
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 Tips for a Great Game:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Make your lie plausible and similar in style to your truths</li>
              <li>• Use specific details to make statements more believable</li>
              <li>• Avoid obviously false statements</li>
              <li>• Keep the tone consistent across all three statements</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <CarnivalButton
              variant="secondary"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1"
            >
              Back
            </CarnivalButton>
            <CarnivalButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
              size="lg"
            >
              {isSubmitting ? 'Creating...' : 'Create Game Post! 🎪'}
            </CarnivalButton>
          </div>
        </form>
      </div>
    </div>
  );
};