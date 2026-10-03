# Data Model: A-Spade Auto-play & Suit Following

**Feature**: Slice 2 | **Prerequisite**: [research.md](./research.md)

---

## Overview

This slice extends the Slice 1 data model by adding round-level state to `GameRoom` and extending the shared `RoomSnapshot` to include the current round for real-time rendering.

---

## New & Extended Entities

### `RoundState` *(new — backend internal)*

The live round in progress. Stored as `currentRound: RoundState | null` on `GameRoom`. `null` means no round is active (between rounds or game not yet started).

| Field | Type | Description |
|---|---|---|
| `ledSuit` | `Suit` | The suit of the first card played in this round |
| `starterPlayerId` | `string` | Player ID of whoever leads this round |
| `currentTurnPlayerId` | `string` | Player ID of whoever must play next |
| `playedCards` | `PlayedCard[]` | Ordered list of cards played so far in this round |
| `turnOrder` | `string[]` | Ordered player IDs (clockwise from starter, active players only) |
| `roundNumber` | `number` | 1-indexed counter incremented each time a new round begins |

**State transitions**:
- `null → RoundState`: On game start (A♠ auto-play fires, Round 1 begins)
- `RoundState (partial) → RoundState (partial)`: Each `play-card` event advances `currentTurnPlayerId` and appends to `playedCards`
- `RoundState → null → RoundState`: On round resolution (cards discarded / reallocated, new round initialised)

**Validation rules**:
- `ledSuit` is immutable for the duration of one round
- `playedCards.length` must equal the number of players who have taken their turn in this round
- `currentTurnPlayerId` must always be a member of `turnOrder`

---

### `PlayedCard` *(new — backend internal)*

A single card played within the current round.

| Field | Type | Description |
|---|---|---|
| `playerId` | `string` | The player who played this card |
| `card` | `Card` | The card played (`{ suit, rank }`) |
| `turnIndex` | `number` | Position in play order (0 = first to play) |

---

### `RoundSnapshot` *(new — shared type, embedded in `RoomSnapshot`)*

The public, client-safe projection of `RoundState`. Omits internal fields not needed by the UI.

| Field | Type | Description |
|---|---|---|
| `roundNumber` | `number` | Current round index |
| `ledSuit` | `Suit` | Led suit for this round |
| `currentTurnPlayerId` | `string` | Whose turn it is |
| `playedCards` | `PlayedCardPublic[]` | Cards visible on the table |

---

### `PlayedCardPublic` *(new — shared type)*

The public projection of `PlayedCard` — safe to broadcast to all clients.

| Field | Type | Description |
|---|---|---|
| `playerId` | `string` | Player who played the card |
| `card` | `Card` | The card played |

---

### `GameRoom` *(extended — backend internal)*

Existing `GameRoom` gains one new field:

| New Field | Type | Description |
|---|---|---|
| `currentRound` | `RoundState \| null` | Active round state; `null` between rounds or before game starts |

---

### `RoomSnapshot` *(extended — shared type)*

Existing `RoomSnapshot` gains one new field for the client:

| New Field | Type | Description |
|---|---|---|
| `currentRound` | `RoundSnapshot \| null` | Current round data for UI rendering; `null` if no round active |

---

### `ErrorCode` *(extended — shared type)*

Two new error codes added to the existing union:

| New Code | When emitted |
|---|---|
| `MUST_FOLLOW_SUIT` | Player attempts to play an off-suit card while holding the led suit |
| `NOT_YOUR_TURN` | Player attempts to play when it is not their turn |

---

## Rank Ordering (used by round resolution)

```
A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
```

No trump suit. All comparison is within the led suit only.

---

## New Backend Module: Round Engine

A pure domain module `backend/src/game/round-engine.ts` contains stateless functions only:

| Function | Signature | Purpose |
|---|---|---|
| `findAceOfSpades` | `(players: PlayerInternal[]) → string` | Returns the `playerId` of the A♠ holder |
| `buildTurnOrder` | `(players: PlayerInternal[], starterId: string) → string[]` | Returns clockwise player ID array from starter |
| `createRound` | `(starterPlayerId: string, turnOrder: string[], roundNumber: number, firstCard: Card) → RoundState` | Initialises a new `RoundState` from the first played card |
| `validatePlay` | `(round: RoundState, playerId: string, card: Card, hand: Card[]) → 'ok' \| 'NOT_YOUR_TURN' \| 'MUST_FOLLOW_SUIT' \| 'CARD_NOT_IN_HAND'` | All game rule checks in one function |
| `applyPlay` | `(round: RoundState, playerId: string, card: Card, nextTurnPlayerId: string) → RoundState` | Returns new round state after a legal play |
| `resolveRound` | `(round: RoundState) → RoundResult` | Determines outcome: cards discarded, who leads next |
| `compareRank` | `(a: Rank, b: Rank) → number` | Returns positive if `a` outranks `b` |

All functions are pure (`(input) → output`) with no side effects.

---

## Relationships

```
GameRoom
  └── currentRound: RoundState | null
        ├── playedCards: PlayedCard[]
        └── turnOrder: string[]  (references PlayerInternal.playerId)

RoomSnapshot  (broadcast to all clients)
  └── currentRound: RoundSnapshot | null
        └── playedCards: PlayedCardPublic[]
```
