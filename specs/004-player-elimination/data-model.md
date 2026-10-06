# Data Model: Player Elimination & Kazhutha

**Feature**: 004-player-elimination  
**Status**: Completed

## Entities & Type Definitions

### 1. Player (Domain & DTO)

#### Backend Domain (`Player`)
- `playerId: string` (read-only identifier)
- `displayName: string` (display name)
- `socketId: string` (active Socket.IO connection id)
- `isConnected: boolean` (network presence flag)
- `lastSeen: number` (timestamp)
- `hand: Card[]` (private cards held in memory)
- `finishPosition: number | null` (1-indexed finish rank: 1st, 2nd, ..., N; `null` while active)

**Methods**:
- `isSpectator(): boolean` -> returns `this.finishPosition !== null`
- `markFinished(position: number): void` -> sets `this.finishPosition`
- `cardCount: number` -> returns `this.hand.length`

#### Shared DTO (`PlayerPublic`)
```typescript
export interface PlayerPublic {
  playerId: string;
  displayName: string;
  cardCount: number;
  isConnected: boolean;
  isSpectator?: boolean;
  finishPosition?: number | null;
}
```

---

### 2. Game (Domain & DTO)

#### Backend Domain (`Game`)
- `roomCode: number`
- `hostPlayerId: string`
- `status: GameStatus` (`'WAITING' | 'DEALING' | 'IN_PROGRESS' | 'FINISHED'`)
- `players: Map<string, Player>`
- `currentRound: Round | null`
- `nextRoundStarterId: string | null`
- `finishOrder: string[]` (ordered list of `playerId`s as they finish; last item is Kazhutha)
- `kazhuthaPlayerId: string | null` (set when `status === 'FINISHED'`)

**Methods & Lifecycle**:
- `getActivePlayers(): Player[]` -> returns players where `!player.isSpectator()`
- `getActiveTurnOrder(starterPlayerId: string): string[]` -> clockwise active player IDs starting from `starterPlayerId`
- `checkPlayerFinished(player: Player): void` -> if `player.cardCount === 0 && !player.isSpectator()`, append to `finishOrder` and call `player.markFinished(finishOrder.length)`
- `checkGameOver(): void` -> if `activePlayers.length <= 1`:
  - `status = GameStatusConst.FINISHED`
  - If `activePlayers.length === 1`, mark that final active player as finished and assign as Kazhutha
- `resolveRoundEliminations(): { newlyEliminated: string[] }` -> scans all players in the room whose hands are now empty post-round-resolution, updates `finishOrder`, and runs `checkGameOver()`.

#### Shared DTO (`RoomSnapshot`)
```typescript
export interface RoomSnapshot {
  roomCode: number;
  status: GameStatus;
  hostPlayerId: string;
  players: PlayerPublic[];
  currentRound: RoundSnapshot | null;
  nextRoundStarterId?: string | null;
  kazhuthaPlayerId?: string | null;
  finishOrder?: string[];
}
```

---

### 3. Round (Domain)

- `roundNumber: number`
- `starterPlayerId: string`
- `ledSuit: Suit`
- `turnOrder: readonly string[]` (strictly ordered list of active player IDs for this round)
- `playedCards: PlayedCard[]`
- `currentTurnIndex: number`

**Invariants**:
- `turnOrder` contains ONLY active players (`!player.isSpectator()`).
- `turnOrder.length >= 2` during regular rounds, or terminates when `checkGameOver()` completes.
- Complete round length matches `turnOrder.length`.

---

## State Transitions

### Player Lifecycle
```
[WAITING / DEALING]
       │
       ▼
   [ACTIVE] (hand.length > 0, finishPosition = null)
       │
       ├─ (Plays last card, does NOT take Vett pile, round resolves) ──► [SPECTATOR] (hand = 0, finishPosition = 1..N-1)
       │
       └─ (Last player holding cards when active count reaches 1) ────► [KAZHUTHA / SPECTATOR] (finishPosition = N)
```

### Game Lifecycle
```
[WAITING] ──(Host starts)──► [IN_PROGRESS] ──(Rounds resolve, activePlayers.length <= 1)──► [FINISHED]
                                                                                              (kazhuthaPlayerId set)
```

---

## Invariants & Rules

1. **Post-Resolution Elimination**: Card exhaustion is strictly evaluated at round resolution (vett resolution or full trick completion). A player cannot be eliminated mid-round before trick ownership is decided.
2. **Spectator Exclusion**: Spectators are skipped in turn order; no spectator can be in `turnOrder` or assigned `nextRoundStarterId`.
3. **Priority Succession**: If the player who played the highest card of the led suit empties their hand on that trick, the starter for the next trick is the player who played the second-highest card of the led suit in that round (or highest among players who still have cards remaining).
4. **Kazhutha Invariant**: The final player remaining with cards is marked Kazhutha and receives the final finish position; no further rounds are initiated.
