import React, { useState } from 'react';
import { CarnivalButton } from './CarnivalButton';
import type { LeaderboardEntry, UserScore } from '../../shared/types/game';

interface LeaderboardProps {
  guesserLeaderboard: LeaderboardEntry[];
  liarLeaderboard: LeaderboardEntry[];
  userStats?: UserScore;
  onBack: () => void;
  onCreateGame: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  guesserLeaderboard,
  liarLeaderboard,
  userStats,
  onBack,
  onCreateGame,
}) => {
  const [activeTab, setActiveTab] = useState<'guessers' | 'liars'>('guessers');

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const currentLeaderboard = activeTab === 'guessers' ? guesserLeaderboard : liarLeaderboard;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border-4 border-gray-300 p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-600">
            See who's the best at spotting lies and crafting deceptions!
          </p>
        </div>

        {/* User Stats */}
        {userStats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Your Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-600 font-medium">Level {userStats.level}</div>
                <div className="text-blue-500">{userStats.experience} XP</div>
              </div>
              <div>
                <div className="text-blue-600 font-medium">Games Played: {userStats.totalGames}</div>
                <div className="text-blue-500">Accuracy: {userStats.totalGames > 0 ? Math.round((userStats.correctGuesses / userStats.totalGames) * 100) : 0}%</div>
              </div>
              <div>
                <div className="text-green-600 font-medium">Guesser Points: {userStats.guesserPoints}</div>
              </div>
              <div>
                <div className="text-red-600 font-medium">Liar Points: {userStats.liarPoints}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('guessers')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === 'guessers'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🕵️ Best Guessers
          </button>
          <button
            onClick={() => setActiveTab('liars')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              activeTab === 'liars'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎭 Best Liars
          </button>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3 mb-8">
          {currentLeaderboard.length > 0 ? (
            currentLeaderboard.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold w-8">
                    {getRankEmoji(entry.rank)}
                  </span>
                  <span className="font-medium text-gray-800">
                    u/{entry.username}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {entry.score}
                  </div>
                  <div className="text-xs text-gray-500">
                    {activeTab === 'guessers' ? 'lies spotted' : 'players fooled'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">🎪</p>
              <p>No entries yet! Be the first to play!</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <CarnivalButton
            variant="secondary"
            onClick={onBack}
            className="flex-1"
          >
            Back
          </CarnivalButton>
          <CarnivalButton
            variant="primary"
            onClick={onCreateGame}
            className="flex-1"
          >
            Create Your Game 🎪
          </CarnivalButton>
        </div>
      </div>
    </div>
  );
};