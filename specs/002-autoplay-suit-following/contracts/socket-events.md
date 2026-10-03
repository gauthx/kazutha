# Socket Events Contract: A-Spade Auto-play & Suit Following

**Feature**: Slice 2 | **Transport**: Socket.IO over WebSocket
**Extends**: [Slice 1 socket-events.md](../../001-cards-in-hand/contracts/socket-events.md)

> All payloads are JSON. `→` = client emits to server. `←` = server emits to client(s).

---

## Extended Events

### ← `state-sync` *(extended)*

Emitted to a reconnecting socket. **Now includes `currentRound`** in the `roomSnapshot`.

```typescript
// StateSyncPayload (extended)
{
  hand: Card[];
  roomSnapshot: RoomSnapshot;  // RoomSnapshot.currentRound is now populated
}
```

---

### ← `room-update` *(extended)*

Broadcast to all sockets in a room when room/round state changes. **Now includes `currentRound`**.

```typescript
// Payload: RoomSnapshot (extended)
{
  roomCode: number;
  status: GameStatus;
  hostPlayerId: string;
  players: PlayerPublic[];
  currentRound: RoundSnapshot | null;   // NEW
}
```

---

## New Events (Slice 2)

### → `play-card`

Emitted by the client when the local player plays a card.

```typescript
// PlayCardPayload
{
  playerId: string;
  card: Card;  // { suit: Suit; rank: Rank }
}
```

**Server acknowledgement** (Socket.IO ack callback):

```typescript
// Success
{ ok: true }

// Failure
{ ok: false; code: 'NOT_YOUR_TURN' | 'MUST_FOLLOW_SUIT' | 'CARD_NOT_IN_HAND' | 'INTERNAL_ERROR'; message: string }
```

**Server side-effects on success**:
1. Removes the card from the player's hand
2. Appends to `currentRound.playedCards`
3. Advances `currentRound.currentTurnPlayerId` to next active player OR resolves the round
4. Broadcasts `round-update` to the room

---

### ← `round-started`

Emitted to all room sockets at the beginning of each new round (including Round 1 from A♠ auto-play).

```typescript
// RoundStartedPayload
{
  roomSnapshot: RoomSnapshot;   // includes currentRound populated
  autoPlayedCard?: {            // present only for A♠ auto-play (Round 1)
    playerId: string;
    card: Card;
  };
}
```

---

### ← `round-update`

Emitted to all room sockets after every legal `play-card`. Updates the table view for all players.

```typescript
// RoundUpdatePayload
{
  roomSnapshot: RoomSnapshot;   // currentRound reflects the latest play
}
```

---

### ← `round-ended`

Emitted to all room sockets when a round completes cleanly (no vett — all players followed suit).

```typescript
// RoundEndedPayload
{
  discardedCards: Card[];       // all cards removed from the game
  nextStarterPlayerId: string;  // player who played the highest led-suit card
  roomSnapshot: RoomSnapshot;   // currentRound is null (between rounds)
}
```

---

## Error Codes (new)

| Code | Trigger |
|---|---|
| `NOT_YOUR_TURN` | `play-card` emitted when it is not the player's turn |
| `MUST_FOLLOW_SUIT` | `play-card` emitted with an off-suit card while player holds led-suit cards |
| `CARD_NOT_IN_HAND` | `play-card` references a card not currently in the player's hand |

---

## Event Sequence: Round 1 (A♠ Auto-play)

```
Host clicks "Start Game"
  → POST /api/rooms/:code/start  (HTTP, Slice 1)
  ← Server deals cards
  ← Server finds A♠ holder, plays A♠ automatically
  ← server emits round-started (autoPlayedCard: { A♠ }) to room
  ← server emits state-sync to each reconnecting socket (hand updated, A♠ removed)
```

## Event Sequence: Normal Turn

```
Player's turn arrives (currentTurnPlayerId = player)
  Client renders hand with off-suit cards greyed (if player holds led suit)
  → play-card { playerId, card }
  ← ack { ok: true }
  ← round-update broadcast to room
  [if last player in round]
  ← round-ended broadcast to room
  ← round-started (new round) broadcast to room
```

## Event Sequence: Illegal Play (Suit Violation)

```
Player attempts off-suit card while holding led suit
  → play-card { playerId, card }
  ← ack { ok: false, code: 'MUST_FOLLOW_SUIT', message: '...' }
  [no broadcast — room state unchanged]
```
