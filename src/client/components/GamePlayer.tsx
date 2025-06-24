import React, { useState } from 'react';
import { CarnivalButton } from './CarnivalButton';
import type { GamePost, UserGuess } from '../../shared/types/game';

interface GamePlayerProps {
  gamePost: GamePost;
  onGuess: (guessIndex: number) => Promise<void>;
  onShowLeaderboard: () => void;
  hasGuessed: boolean;
  userGuess?: UserGuess;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ 
  gamePost, 
  onGuess, 
  onShowLeaderboard,
  hasGuessed,
  userGuess 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statements = [gamePost.truth1, gamePost.truth2, gamePost.lie];

  const handleGuess = async () => {
    if (selectedIndex === null || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onGuess(selectedIndex);
    } catch (error) {
      console.error('Error submitting guess:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatementStyle = (index: number) => {
    if (!hasGuessed) {
      return selectedIndex === index 
        ? 'border-blue-500 bg-blue-50' 
        : 'border-gray-300 hover:border-gray-400';
    }

    // Show results after guessing
    if (index === gamePost.lieIndex) {
      return 'border-red-500 bg-red-50'; // The lie
    } else {
      return 'border-green-500 bg-green-50'; // Truths
    }
  };

  const getStatementIcon = (index: number) => {
    if (!hasGuessed) return null;
    
    if (index === gamePost.lieIndex) {
      return <span className="text-red-600 font-bold">❌ LIE</span>;
    } else {
      return <span className="text-green-600 font-bold">✅ TRUTH</span>;
    }
  };

  const getUserChoiceIndicator = (index: number) => {
    if (!hasGuessed || !userGuess) return null;
    
    if (index === userGuess.guessIndex) {
      return <span className="text-blue-600 font-semibold">(Your choice)</span>;
    }
    return null;
  };

  const getPercentageBar = (index: number) => {
    if (!hasGuessed || gamePost.totalGuesses === 0) return null;
    
    const percentage = Math.round((gamePost.guessBreakdown[index] / gamePost.totalGuesses) * 100);
    const votes = gamePost.guessBreakdown[index];
    
    return (
      <div className="mt-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{votes} vote{votes !== 1 ? 's' : ''}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border-4 border-gray-300 p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎪 Two Truths One Lie</h1>
          <p className="text-gray-600">
            {hasGuessed 
              ? userGuess?.isCorrect 
                ? '🎉 Congratulations! You spotted the lie!' 
                : '😅 Nice try! Better luck next time!'
              : 'Can you spot the lie? Choose the statement you think is false!'
            }
          </p>
          <div className="mt-4 text-sm text-gray-500">
            By u/{gamePost.authorUsername} • {gamePost.totalGuesses} player{gamePost.totalGuesses !== 1 ? 's' : ''} have guessed
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {statements.map((statement, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${getStatementStyle(index)}`}
              onClick={() => !hasGuessed && setSelectedIndex(index)}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-800 font-medium flex-1">{statement.text}</p>
                <div className="ml-4 flex flex-col items-end gap-1">
                  {getStatementIcon(index)}
                  {getUserChoiceIndicator(index)}
                </div>
              </div>
              
              {hasGuessed && statement.description && index !== gamePost.lieIndex && (
                <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                  <p className="text-sm text-gray-700 italic">
                    <strong>Details:</strong> {statement.description}
                  </p>
                </div>
              )}
              
              {getPercentageBar(index)}
            </div>
          ))}
        </div>

        {!hasGuessed ? (
          <div className="text-center">
            <CarnivalButton
              variant="primary"
              size="lg"
              onClick={handleGuess}
              disabled={selectedIndex === null || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Guess! 🎯'}
            </CarnivalButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                💬 How surprising were the truths? Comment below!
              </p>
              <CarnivalButton
                variant="secondary"
                onClick={onShowLeaderboard}
                className="w-full"
              >
                View Leaderboard 🏆
              </CarnivalButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};