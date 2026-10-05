# Data Model: Vett (Round Breaking) — Slice 3

## Modified Entities

### `RoundEndedPayload` (shared/types.ts)

Extended to carry vett metadata that the frontend needs to render round-result feedback.

| Field | Type | Description |
|---|---|---|
| `discardedCards` | `Card[]` | Cards discarded face-down (populated only for clean rounds; empty for vett) |
| `nextStarterPlayerId` | `string` | Player ID who will lead the next round |
| `roomSnapshot` | `RoomSnapshot` | Full room state after round resolution |
| `isVett` | `boolean` *(new)* | `true` when the round ended by a vett; `false` for a clean round |
| `pileWinnerPlayerId` | `string \| null` *(new)* | The player who received the pile (only set when `isVett === true`) |

> **Note**: `pileWinnerPlayerId` equals `nextStarterPlayerId` when a vett occurs. Both fields are kept separate for clarity — `nextStarterPlayerId` is always the next leader; `pileWinnerPlayerId` is the receiver of the physical cards.

---

### `PlayCardResult` (backend/src/game/domain/game.ts)

Already has `isVett?: boolean`. Extended with:

| Field | Type | Description |
|---|---|---|
| `pileWinnerPlayerId` | `string \| undefined` *(new)* | Set when `isVett === true`; identifies who collected the pile |

---

## Existing Entities (Unchanged Structure, Behaviour Fixed)

### `Round` (backend/src/game/domain/round.ts)

No structural changes. `getHighestLedSuitPlay()` is already correct and will now be called in the vett branch.

### `Player` (backend/src/game/domain/player.ts)

No structural changes. `addCards()` is already correct.

### `Game` (backend/src/game/domain/game.ts)

Vett resolution logic changes (same fields, corrected behaviour):

| State before fix | State after fix |
|---|---|
| Vett player receives all played cards + vett card | Highest led-suit-card player receives all played cards + vett card |
| `nextRoundStarterId` = vett player | `nextRoundStarterId` = pile winner (highest led-suit-card player) |

---

## State Transitions

```
ROUND IN PROGRESS
    │
    ├── Player plays on-suit card
    │       │
    │       ├── Not last player → ROUND CONTINUES (round-update emitted)
    │       └── Last player (all followed suit) → CLEAN ROUND END
    │               - All played cards discarded
    │               - nextRoundStarterId = highest-card player
    │               - round-ended { isVett: false, discardedCards: [...] }
    │
    └── Player plays off-suit card (no led suit in hand)
            └── VETT
                - Round immediately ends
                - Pile winner = player who played highest led-suit card
                - Pile winner receives all played cards + vett card
                - nextRoundStarterId = pile winner
                - round-ended { isVett: true, pileWinnerPlayerId: <id> }

BETWEEN ROUNDS
    roomSnapshot.currentRound = null
    roomSnapshot.nextRoundStarterId = <winner id>
    → UI shows "Waiting for [name] to start the next round…"
    → Only the starter may play (leads with any card)
```

---

## Frontend State Shape

### New local state in `GamePage` / `GameTable`

| State variable | Type | Purpose |
|---|---|---|
| `roundResult` | `RoundResult \| null` | Holds vett/clean outcome for the transient banner |

```typescript
// In frontend, not shared — purely presentational
interface RoundResult {
  isVett: boolean;
  pileWinnerPlayerId: string | null;
  nextStarterPlayerId: string;
}
```

This state is set when `round-ended` fires and cleared after a ~2 second timeout (or on the next `round-update` / `round-ended` event).

---

## Validation Rules (unchanged from Spec)

| Rule | Enforcement point |
|---|---|
| Player must follow led suit if they hold it | `Game.playCard()` — throws `MUST_FOLLOW_SUIT` |
| Vett only valid when player truly has no led-suit cards | `player.hasSuit(ledSuit)` check in `Game.playCard()` |
| Pile winner = highest-ranked led-suit card before vett | `Round.getHighestLedSuitPlay()` |
| No ties possible | Card rank ordering is strict (A > K > … > 2) |
