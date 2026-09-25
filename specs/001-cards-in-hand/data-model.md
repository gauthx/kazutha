# Data Model: Cards in Hand (Slice 1)

**Date**: 2026-09-23
**Feature**: specs/001-cards-in-hand

---

## Entities

### Card

The atomic unit of the game. Immutable once created.

| Field | Type | Description |
|---|---|---|
| `suit` | `'SPADES' \| 'HEARTS' \| 'DIAMONDS' \| 'CLUBS'` | The card's suit |
| `rank` | `'A' \| '2' \| ... \| '10' \| 'J' \| 'Q' \| 'K'` | The card's rank |

**Validation rules**:
- Every card in the deck is unique — no two cards share the same `suit` + `rank` combination.
- The full deck contains exactly 52 cards (4 suits × 13 ranks).

**Note on representation**: Stored internally as `{ suit, rank }`. Converted to the card library's two-character code string (e.g. `Ah`, `Td`) only in the frontend rendering layer.

---

### Player

A participant in a game room. Identity is decoupled from the socket connection.

| Field | Type | Description |
|---|---|---|
| `playerId` | `string` (UUID v4) | Stable identity, generated server-side on first join. Persisted in client `localStorage`. |
| `displayName` | `string` | Human-readable name entered at join time. Not unique within a room. |
| `socketId` | `string` | Ephemeral Socket.IO socket ID. Updated on every reconnect. |
| `hand` | `Card[]` | Cards currently held by this player. Empty until game starts. |
| `isConnected` | `boolean` | Whether the player currently has an active socket connection. |
| `lastSeen` | `number` | Unix timestamp (ms) of last socket activity. Used for grace-period eviction. |

**State transitions**:
```
[join] → isConnected: true
[disconnect] → isConnected: false, lastSeen updated, 30s eviction timer starts
[reconnect within 30s] → isConnected: true, socketId updated, eviction timer cancelled
[reconnect after 30s] → player has been evicted; treated as a new join
[game starts] → hand populated with dealt cards
```

**Validation rules**:
- `displayName` must be between 1 and 24 characters after trimming whitespace.
- A player can only exist in one room at a time.
- `hand` is empty (`[]`) in the lobby state; non-empty once game status is `IN_PROGRESS`.

---

### GameRoom

The container for a single game session. Transitions through lobby → in-progress states.

| Field | Type | Description |
|---|---|---|
| `roomCode` | `string` | 4-digit numeric identifier (starts at 1000 and increments). |
| `status` | `GameStatus` | Current lifecycle phase of the room. |
| `players` | `Map<playerId, Player>` | All players in the room, keyed by stable `playerId`. |
| `hostPlayerId` | `string` | The `playerId` of the room creator. Transferred if host disconnects. |
| `deck` | `Card[]` | The shuffled deck at game start. Cleared after dealing. |
| `createdAt` | `number` | Unix timestamp (ms). Used for audit and TTL calculation. |
| `lastActivityAt` | `number` | Unix timestamp (ms). Updated on every room event. Used for TTL eviction. |

**GameStatus enum** (string literals):

| Status | Meaning |
|---|---|
| `'WAITING'` | Lobby — players are joining, game has not started |
| `'DEALING'` | Transitional — deck is being shuffled and hands distributed |
| `'IN_PROGRESS'` | Game is active — all players have their hands |
| `'FINISHED'` | Game has ended (used in later slices) |

**State transitions**:
```
createRoom() → status: WAITING
startGame()  → status: DEALING → status: IN_PROGRESS (after deal completes)
```

**Validation rules**:
- Minimum 2 players required to transition from `WAITING` to `DEALING`.
- Maximum 6 players. A join attempt when `players.size >= 6` is rejected.
- Only the host can trigger `startGame`.
- A player cannot join a room with status `IN_PROGRESS` or `FINISHED`.
- Room TTL: evicted from memory after 2 hours of inactivity.

---

### Deck (ephemeral, not persisted)

A transient artefact created at `startGame`, used for dealing, then discarded.

| Property | Value |
|---|---|
| Total cards | 52 |
| Suits | SPADES, HEARTS, DIAMONDS, CLUBS |
| Ranks per suit | A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K |
| Shuffle algorithm | Fisher-Yates (Durstenfeld), `Math.random` bound = `(i + 1)` |
| Dealing algorithm | Round-robin: card `i` → player `i % numPlayers` |

**Dealing distribution** (52 cards):

| Players | Hand sizes |
|---|---|
| 2 | 26, 26 |
| 3 | 18, 17, 17 |
| 4 | 13, 13, 13, 13 |
| 5 | 11, 11, 10, 10, 10 |
| 6 | 9, 9, 9, 9, 8, 8 |

---

## Entity Relationships

```
GameRoom  1 ──── 1..6  Player
                          │
                          └─── 0..* Card  (player.hand)

Deck (ephemeral) ──── 52 Cards (created at startGame, consumed by deal)
```

---

## Shared Type Definitions (shared/types.ts)

These types are the source of truth imported by both frontend and backend.

```typescript
// Location: shared/types.ts
// Rule: No imports from node_modules. Pure TypeScript type declarations only.

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type GameStatus = 'WAITING' | 'DEALING' | 'IN_PROGRESS' | 'FINISHED';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface PlayerPublic {
  playerId: string;
  displayName: string;
  cardCount: number;      // how many cards remain — visible to all players
  isConnected: boolean;
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];           // only sent to the owning player
}

export interface RoomSnapshot {
  roomCode: string;
  status: GameStatus;
  hostPlayerId: string;
  players: PlayerPublic[];  // safe to broadcast to the room
}

// Socket.IO event payload types — see contracts/ for full event map
export interface JoinRoomPayload {
  displayName: string;
  roomCode: string;
}

export interface JoinAckPayload {
  playerId: string;
  roomCode: string;
}

export interface StateSyncPayload {
  hand: Card[];
  roomSnapshot: RoomSnapshot;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
```

**Design note**: `PlayerPublic` (card count, connection status) is safe to broadcast to the whole room. `PlayerPrivate` (full hand) is sent only via `socket.emit` to the owning player, never via `server.to(room).emit`.
