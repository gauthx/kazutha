# Socket.IO Contracts: Vett (Round Breaking) — Slice 3

This document describes only the events **added or modified** by Slice 3. All existing events (`play-card`, `round-update`, `room-update`, `state-sync`, `round-started`) are unchanged unless noted.

---

## Modified Events

### `round-ended` (server → all clients in room)

**When emitted**: After every round ends — both vett and clean-round paths.

**Changes from Slice 2**: Added `isVett` and `pileWinnerPlayerId` fields.

```typescript
interface RoundEndedPayload {
  // Existing fields (unchanged)
  discardedCards: Card[];          // Non-empty only for clean rounds; [] for vett
  nextStarterPlayerId: string;     // Player ID who leads the next round
  roomSnapshot: RoomSnapshot;      // Full room state (updated cardCounts, null currentRound)

  // New fields (Slice 3)
  isVett: boolean;                 // true = vett ended round; false = clean round
  pileWinnerPlayerId: string | null; // Pile recipient (null for clean rounds)
}
```

**Example — vett round**:
```json
{
  "discardedCards": [],
  "nextStarterPlayerId": "player-abc",
  "isVett": true,
  "pileWinnerPlayerId": "player-abc",
  "roomSnapshot": {
    "currentRound": null,
    "nextRoundStarterId": "player-abc",
    "players": [
      { "playerId": "player-abc", "cardCount": 5, ... },
      { "playerId": "player-xyz", "cardCount": 3, ... }
    ],
    ...
  }
}
```

**Example — clean round**:
```json
{
  "discardedCards": [
    { "suit": "HEARTS", "rank": "A" },
    { "suit": "HEARTS", "rank": "K" }
  ],
  "nextStarterPlayerId": "player-abc",
  "isVett": false,
  "pileWinnerPlayerId": null,
  "roomSnapshot": { ... }
}
```

---

## New Events

### `state-sync` (server → pile-winner socket only, on vett)

**When emitted**: Immediately after vett resolution, targeted to the pile-winner's socket only.

**Purpose**: The pile winner's hand has grown (received all played cards + vett card). They need a private hand refresh since other players must not see each other's hand contents.

**Event name**: `state-sync` (same as reconnect sync — `useHand` already handles it)

```typescript
interface StateSyncPayload {
  hand: Card[];          // Full updated hand of the pile winner
  roomSnapshot: RoomSnapshot;
}
```

**Delivery**: `server.to(pileWinnerSocketId).emit('state-sync', payload)` — unicast, not broadcast.

---

## Unchanged Events (Reference)

| Event | Direction | Description |
|---|---|---|
| `play-card` | client → server | Player plays a card; ack returned |
| `round-update` | server → room | A card was played but round is not yet over |
| `room-update` | server → room | Player connect/disconnect, general state change |
| `state-sync` | server → socket | Private hand + room snapshot on reconnect |
| `error` | server → socket | Error payload with code and message |

---

## Error Codes (Unchanged)

| Code | Trigger |
|---|---|
| `NOT_YOUR_TURN` | Playing out of turn |
| `MUST_FOLLOW_SUIT` | Playing off-suit when led suit is held |
| `CARD_NOT_IN_HAND` | Playing a card not in hand |
