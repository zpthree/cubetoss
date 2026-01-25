# Toss Up! - Architecture Documentation

A real-time multiplayer dice game built with SvelteKit, featuring ephemeral rooms and no database.

## Table of Contents

- [Game Rules](#game-rules)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Real-Time Updates (SSE)](#real-time-updates-sse)
- [Game Flow](#game-flow)
- [State Management](#state-management)
- [Scaling Considerations](#scaling-considerations)

---

## Game Rules

Toss Up! is a press-your-luck dice game for 2+ players.

### The Dice

Each of the 10 dice has 6 faces:

- **3 Green faces** (50% chance) - Worth +1 point, dice gets locked
- **2 Yellow faces** (33% chance) - Neutral, roll again
- **1 Red face** (17% chance) - Danger!

### Gameplay

1. On your turn, roll all unlocked dice
2. **Green dice** are set aside (locked) and add to your turn score
3. **Yellow dice** stay in play - you can roll again or bank
4. **Red dice** are dangerous:
   - If you roll ANY red WITHOUT rolling at least one green = **BUST!**
   - You lose all unbanked points for this turn
   - If you roll red WITH at least one green, you're safe

5. **Banking**: At any time (if you have points), bank your turn score to add it permanently to your total

6. **All 10 Green**: If all dice become green, they reset and you can keep rolling!

### Winning

- First player to reach **100 points** triggers the **Final Round**
- All other players get one more turn to try to beat the high score
- Highest score wins!

---

## Tech Stack

| Component | Technology                        |
| --------- | --------------------------------- |
| Framework | SvelteKit (Svelte 5)              |
| Language  | TypeScript                        |
| Styling   | Tailwind CSS v4                   |
| Real-time | Server-Sent Events (SSE)          |
| Storage   | In-memory (Map)                   |
| State     | Svelte 5 Runes ($state, $derived) |

---

## Project Structure

```
src/
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── index.ts              # Lib exports
│   └── server/
│       └── rooms.ts          # Room management & game logic
├── routes/
│   ├── +page.svelte          # Home page (create/join)
│   ├── +layout.svelte        # App layout
│   ├── layout.css            # Global styles
│   ├── room/
│   │   └── [code]/
│   │       ├── +page.svelte  # Game room UI
│   │       └── +page.ts      # Page load (extracts room code)
│   └── api/
│       └── room/
│           ├── create/+server.ts    # POST: Create room
│           ├── join/+server.ts      # POST: Join room
│           └── [code]/
│               ├── +server.ts       # GET: Room info
│               ├── start/+server.ts # POST: Start game
│               ├── roll/+server.ts  # POST: Roll dice
│               ├── bank/+server.ts  # POST: Bank points
│               └── events/+server.ts # GET: SSE stream
```

---

## Data Models

### DieColor

```typescript
type DieColor = 'green' | 'yellow' | 'red';
```

### Die

```typescript
interface Die {
  id: number;        // 0-9
  color: DieColor;   // Current face showing
  locked: boolean;   // Green dice get locked
}
```

### Player

```typescript
interface Player {
  id: string;          // UUID
  name: string;        // Display name
  isHost: boolean;     // Can start game
  score: number;       // Banked points
  isConnected: boolean;
  turnScore: number;   // Current turn (not used server-side)
}
```

### GameState

```typescript
interface GameState {
  phase: 'waiting' | 'playing' | 'final-round' | 'ended';
  currentPlayerIndex: number;     // Index in players array
  dice: Die[];                    // 10 dice
  turnScore: number;              // Points this turn
  finalRoundTriggeredBy: string | null;
  playersHadFinalTurn: string[];  // Track final round
  winner: string | null;          // Winner's player ID
}
```

### Room

```typescript
interface Room {
  code: string;         // 6-char code (e.g., "ABC123")
  players: Player[];
  gameState: GameState;
  createdAt: number;    // Timestamp
  lastActivity: number; // For cleanup
}
```

---

## API Endpoints

### `POST /api/room/create`

Create a new room.

**Request:**

```json
{
	"hostName": "Alice"
}
```

**Response:**

```json
{
  "success": true,
  "roomCode": "XYZ789",
  "playerId": "uuid-here",
  "room": { ... }
}
```

### `POST /api/room/join`

Join an existing room.

**Request:**

```json
{
	"roomCode": "XYZ789",
	"playerName": "Bob"
}
```

**Response:**

```json
{
  "success": true,
  "playerId": "uuid-here",
  "room": { ... }
}
```

### `GET /api/room/[code]`

Get room information.

**Response:**

```json
{
  "success": true,
  "room": { ... }
}
```

### `POST /api/room/[code]/start`

Start the game (host only, requires 2+ players).

**Request:**

```json
{
	"playerId": "host-uuid"
}
```

### `POST /api/room/[code]/roll`

Roll the dice (current player only).

**Request:**

```json
{
	"playerId": "player-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "busted": false,
  "room": { ... }
}
```

### `POST /api/room/[code]/bank`

Bank points and end turn.

**Request:**

```json
{
	"playerId": "player-uuid"
}
```

### `GET /api/room/[code]/events`

SSE stream for real-time updates.

---

## Real-Time Updates (SSE)

Server-Sent Events provide real-time game state synchronization.

### Connection Flow

1. Client connects to `/api/room/[code]/events`
2. Server sends initial `state-update` with current room
3. Server keeps connection open, sends events as they occur
4. Client reconnects automatically on disconnect

### Event Types

| Event           | Trigger            | Data                 |
| --------------- | ------------------ | -------------------- |
| `state-update`  | Initial connection | `{ room }`           |
| `player-joined` | New player joins   | `{ player, room }`   |
| `player-left`   | Player disconnects | `{ playerId, room }` |
| `game-started`  | Host starts game   | `{ room }`           |
| `dice-rolled`   | Player rolls       | `{ room, busted }`   |
| `turn-ended`    | Player banks       | `{ room }`           |
| `game-ended`    | Game finishes      | `{ room, winner }`   |

### Server Implementation

```typescript
// rooms.ts
const connections = new Map<string, Set<Callback>>();

export function broadcastToRoom(code: string, event: string, data: unknown) {
  const roomConnections = connections.get(code.toUpperCase());
  if (roomConnections) {
    for (const callback of roomConnections) {
      callback(event, data);
    }
  }
}
```

### Client Implementation

```typescript
// +page.svelte
const eventSource = new EventSource(`/api/room/${code}/events`);

eventSource.addEventListener('dice-rolled', (e) => {
  const { room, busted } = JSON.parse(e.data);
  // Update local state
});
```

---

## Game Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        WAITING                               │
│  • Host creates room, gets code                             │
│  • Players join with code                                    │
│  • Host clicks "Start Game" (needs 2+ players)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        PLAYING                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Current Player's Turn                                │    │
│  │                                                      │    │
│  │  Roll Dice ──► Check Results                        │    │
│  │                    │                                 │    │
│  │         ┌──────────┼──────────┐                     │    │
│  │         ▼          ▼          ▼                     │    │
│  │     Red only   Green+Any   Yellow only              │    │
│  │     (no green)                                      │    │
│  │         │          │          │                     │    │
│  │         ▼          ▼          ▼                     │    │
│  │      BUST!     Lock greens  Continue                │    │
│  │    Next turn   Add points   (can roll              │    │
│  │                or bank)      again)                 │    │
│  │                                                      │    │
│  │  Bank Points ──► Add to score ──► Next turn         │    │
│  │                                                      │    │
│  │  If score >= 100 ──► Trigger Final Round            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FINAL ROUND                             │
│  • Everyone gets one more turn                              │
│  • Try to beat the highest score                            │
│  • After all players go → determine winner                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         ENDED                                │
│  • Display winner                                           │
│  • Option to play again                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management

### Server-Side

- **Rooms**: `Map<string, Room>` - All active rooms
- **Connections**: `Map<string, Set<Callback>>` - SSE callbacks per room
- **Cleanup**: Rooms inactive for 2 hours are automatically deleted

### Client-Side

Using Svelte 5 runes:

```typescript
// Reactive state
let room: Room | null = $state(null);
let rolling = $state(false);
let showingRoll = $state(false);

// Derived state (computed)
let currentPlayer = $derived(room?.players[room.gameState.currentPlayerIndex]);
let isMyTurn = $derived(currentPlayer?.id === playerId);
let canRoll = $derived(isMyTurn && !rolling && gameInProgress);
```

### Session Storage

Player authentication stored in browser:

```typescript
sessionStorage.setItem('playerId', playerId);
sessionStorage.setItem('roomCode', roomCode);
sessionStorage.setItem('playerName', playerName);
```

---

## Scaling Considerations

### Current Limitations

| Resource        | Limit         | Bottleneck                  |
| --------------- | ------------- | --------------------------- |
| SSE Connections | ~10-50K       | Node.js event loop          |
| Memory          | Minimal       | ~1-2KB per room             |
| Rooms           | ~2,500-12,500 | Connections (4 players avg) |

### To Scale Beyond

1. **Redis** for room storage
   - Enables multiple server instances
   - Pub/sub for cross-instance events

2. **Load Balancer** with sticky sessions
   - Keep SSE connections on same server
   - Or use Redis pub/sub for event distribution

3. **WebSockets** instead of SSE
   - Better for bidirectional communication
   - Use Socket.io or ws with Redis adapter

4. **Database** for persistence
   - PostgreSQL for room/player data
   - Game history, leaderboards

### Current Sweet Spot

The current architecture handles **thousands of concurrent rooms** perfectly for:

- Game nights with friends
- Small to medium community events
- Side projects and demos

---

## Development

### Setup

```bash
npm install
npm run dev
```

### Environment

- Node.js 18+
- No environment variables required
- No database setup needed

### Testing Locally

1. Open http://localhost:5173
2. Create a room
3. Open an incognito window
4. Join with the room code
5. Play!

---

## Future Enhancements

- [ ] Sound effects for rolls/bust
- [ ] Spectator mode
- [ ] Custom win conditions (50, 100, 200 points)
- [ ] Player avatars
- [ ] Game history/statistics
- [ ] Mobile app (using same API)
- [ ] Tournament mode
