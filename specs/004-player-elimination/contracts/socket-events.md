# Interface Contract: Socket.IO Real-time Events

**Feature**: 004-player-elimination  
**Status**: Completed

## Overview

The gameplay communication protocol uses Socket.IO. Active players and spectators both receive real-time room updates, round events, and state synchronization.

---

## Client to Server Events

### `play-card`
Dispatched by a client to play a card from their hand.

**Payload**:
```typescript
interface PlayCardPayload {
  playerId?: string;
  card: Card;
}
```

**Responses (Acknowledgment)**:
- Success:
  ```typescript
  interface PlayCardAck {
    ok: true;
  }
  ```
- Error / Rejection:
  ```typescript
  interface PlayCardNack {
    ok: false;
    code: ErrorCode; // e.g. 'NOT_YOUR_TURN', 'CARD_NOT_IN_HAND', 'MUST_FOLLOW_SUIT'
    message: string;
  }
  ```
- **Spectator Rule**: If a spectator attempts `play-card`, the server returns:
  ```json
  {
    "ok": false,
    "code": "NOT_YOUR_TURN",
    "message": "Player has already finished and is spectating"
  }
  ```

---

## Server to Client Events (Broadcast / Unicast)

### `room-update`
Broadcast to all sockets in `roomCode` whenever room status, roster, or game snapshot changes.

**Payload**: `RoomSnapshot`
```typescript
interface RoomSnapshot {
  roomCode: number;
  status: 'WAITING' | 'DEALING' | 'IN_PROGRESS' | 'FINISHED';
  hostPlayerId: string;
  players: PlayerPublic[];
  currentRound: RoundSnapshot | null;
  nextRoundStarterId?: string | null;
  kazhuthaPlayerId?: string | null;
  finishOrder?: string[];
}
```

**Spectator & Game Over Representation**:
- A spectator has `isSpectator: true`, `finishPosition: 1..N-1`, and `cardCount: 0`.
- When `status === 'FINISHED'`:
  - `kazhuthaPlayerId` is set to the final eliminated player's ID.
  - `finishOrder` contains all player IDs in finish order (with `kazhuthaPlayerId` at index `N-1`).
  - `currentRound` is `null`.
  - `nextRoundStarterId` is `null`.

### `round-ended`
Broadcast to all sockets in `roomCode` when a trick concludes (either via Vett or clean trick discard).

**Payload**:
```typescript
interface RoundEndedPayload {
  discardedCards: Card[];
  nextStarterPlayerId: string;
  roomSnapshot: RoomSnapshot;
  isVett: boolean;
  pileWinnerPlayerId: string | null;
}
```

### `state-sync`
Unicast to a specific player upon connection/reconnection or after receiving cards (e.g. Vett pile recipient).

**Payload**:
```typescript
interface StateSyncPayload {
  hand: Card[];
  roomSnapshot: RoomSnapshot;
}
```
*Note*: For a spectator, `hand` is empty `[]`.
