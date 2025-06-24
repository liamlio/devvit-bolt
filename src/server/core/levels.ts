import type { Level } from '../../shared/types/game';

export const LEVELS: Level[] = [
  { level: 1, name: 'Rookie Detective', experienceRequired: 1, flairText: '🔍 Rookie', flairColor: '#808080' },
  { level: 2, name: 'Truth Seeker', experienceRequired: 10, flairText: '🕵️ Seeker', flairColor: '#4169E1' },
  { level: 3, name: 'Lie Detector', experienceRequired: 20, flairText: '🎯 Detector', flairColor: '#32CD32' },
  { level: 4, name: 'Master Sleuth', experienceRequired: 35, flairText: '🎪 Sleuth', flairColor: '#FFD700' },
  { level: 5, name: 'Truth Master', experienceRequired: 55, flairText: '👑 Master', flairColor: '#FF4500' },
  { level: 6, name: 'Carnival Legend', experienceRequired: 80, flairText: '🎭 Legend', flairColor: '#8A2BE2' },
  { level: 7, name: 'Ultimate Detective', experienceRequired: 110, flairText: '⭐ Ultimate', flairColor: '#DC143C' },
];

export function getLevelByExperience(experience: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (experience >= LEVELS[i].experienceRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getNextLevel(currentLevel: number): Level | null {
  return LEVELS.find(level => level.level === currentLevel + 1) || null;
}

export function calculateExperienceForLevel(level: number): number {
  const levelData = LEVELS.find(l => l.level === level);
  return levelData ? levelData.experienceRequired : 0;
}