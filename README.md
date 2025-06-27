## Two Truths One Lie - Devvit Game

A fun deception game built entirely on Reddit's Devvit platform where players create statements and try to spot the lies!

## Getting Started

This is a pure Devvit application - no React client or Express server needed!

### Setup Steps

1. **Login to Reddit**
   ```bash
   npm run login
   ```

2. **Initialize your app**
   ```bash
   npm run devvit:init
   ```

3. **Update your test subreddit**
   - Create a test subreddit on Reddit
   - Update the `dev:devvit` script in `package.json` to use your subreddit name

4. **Start development**
   ```bash
   npm run dev
   ```

### Installing the Game

1. Go to your test subreddit
2. Use the menu action "[TTOL] Install Game" to create the community hub
3. Use "[TTOL] New Two Truths One Lie Post" to create game posts

## How to Play

### For Players
- View game posts and try to identify which statement is the lie
- Earn experience points for playing and bonus points for correct guesses
- Level up to unlock new titles and abilities

### For Creators
- Create two true statements and one convincing lie
- Earn points when players guess incorrectly on your posts
- Add optional details to make your truths more believable

## Features

- **Level System**: Progress through detective ranks as you play
- **Leaderboards**: Compete to be the best guesser or most convincing liar
- **Carnival Theme**: Beautiful striped background with festive design
- **Real-time Stats**: Track your accuracy and experience points
- **Community Hub**: Central leaderboard and game creation

## Architecture

This app is built entirely with Devvit components:
- **Custom Post Type**: Interactive game interface
- **Redis Storage**: User scores, game data, and leaderboards
- **Menu Actions**: Easy post creation for moderators
- **Scheduler Jobs**: Automated flair updates and notifications

No external dependencies or complex build processes - just pure Devvit!