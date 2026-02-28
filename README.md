# 香港麻雀 - Hong Kong Mahjong Game

A React + Vite implementation of Hong Kong Mahjong (麻雀) - a classic four-player tile game.

## Features

- **Full Mahjong Gameplay**: Complete implementation of Hong Kong Mahjong rules including:
  - Tile drawing and discarding
  - Melds (pung, kong, chi)
  - Win detection and scoring
  - Self-draw wins (自摸)
  
- **AI Opponents**: Play against three AI-controlled players with intelligent tile selection and claiming logic

- **Responsive UI**: Clean, traditional-inspired interface with:
  - Full-width top bar showing round info and scores
  - Central game table showing discard pool
  - Player hand display at the bottom
  - Wind indicators and turn notifications

- **Scoring System**: Comprehensive point calculation based on fan (fan 番) and base points with fair distribution between players

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The game will open at `http://localhost:5173`

### Build

```bash
npm run build
```

## How to Play

1. **Your Turn**: You'll see "YOUR TURN" in the center of the table
2. **Draw**: The AI automatically handles drawing tiles for you
3. **Select & Discard**: Click a tile in your hand to select it, click again to discard
4. **Claims**: When other players discard, you can claim tiles to form melds or win
5. **Scoring**: Wins are automatically calculated and points distributed

## Game Rules

- **Melds**: Form combinations of tiles (three identical tiles, or three consecutive tiles in same suit)
- **Win Condition**: Win with a complete hand of matched pairs and melds
- **Minimum Fan**: Adjustable minimum fan requirement to win (set via controls)
- **Wall**: Limited tiles in the wall; game ends if exhausted without winner

## Layout

- **Top Bar**: Round info, wall count, player scores
- **Center Table**: Current player indicator, discard pool, wall remaining
- **Side Panels**: Left (West) and Right (East) player tiles
- **Bottom**: Your hand (South) and melds display

## Technical Details

- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: React Hooks
- **Styling**: Inline CSS with traditional green felt aesthetic
