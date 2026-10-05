# Research: Vett (Round Breaking) — Slice 3

## Codebase Audit

### What already exists

| Area | Status | Notes |
|------|--------|-------|
| `Game.playCard()` vett branch | ⚠️ **Bug** | Cards are awarded to the **vett player** instead of the highest led-suit card player |
| `Round.getHighestLedSuitPlay()` | ✅ Correct | Already finds the highest-ranked led-suit card |
| `Round.isComplete()` / clean-round path | ✅ Correct | Discards cards, sets `nextRoundStarterId` correctly |
| `MUST_FOLLOW_SUIT` enforcement | ✅ Correct | Rejects off-suit plays when player holds the led suit |
| `round-ended` socket event | ✅ Exists | Carries `discardedCards`, `nextStarterPlayerId`, `roomSnapshot` |
| `RoundEndedPayload` in shared types | ⚠️ Incomplete | Missing `isVett` and `pileWinnerPlayerId` fields needed by the frontend |
| `useRoom.ts` `handleRoundEnded` | ✅ Exists | Updates `roomSnapshot` from payload |
| `useHand.ts` `playCard` | ✅ Exists | Optimistically removes played card from local hand |
| `PlayerHand` suit-lock UI | ✅ Correct | Greys out unplayable cards based on `ledSuit` and `hasLedSuit` |
| `RoundTable` display | ✅ Exists | Shows played cards; no vett/result state yet |
| Frontend round-end feedback | ❌ Missing | No banner, animation, or pile-winner display on `round-ended` |
| Next-starter waiting state | ❌ Missing | No "Waiting for X to start the next round" message between rounds |

---

## Decision Log

### Decision 1: Vett pile winner

- **Decision**: Award the pile to the player who played the **highest-ranked led-suit card before the vett** (per `game_rules.md` §4).
- **Bug found**: Current `game.ts` line 253 gives `[...playedSoFar, card]` to `player` — the vett player — instead of calling `getHighestLedSuitPlay()` and awarding to that player.
- **Fix**: In the vett branch, call `this.currentRound.getHighestLedSuitPlay()` to find `winnerPlayerId`, then call `this.players.get(winnerPlayerId)!.addCards([...playedSoFar, card])`. Remove the `player.addCards(...)` line.
- **Alternatives considered**: None — the game rules are unambiguous.

### Decision 2: `RoundEndedPayload` shape extension

- **Decision**: Add `isVett: boolean` and `pileWinnerPlayerId: string | null` to the existing `RoundEndedPayload` in `shared/types.ts`.
- **Rationale**: The frontend needs to distinguish vett from clean-round endings to show the correct banner, and needs to know who won the pile to display their name.
- **Alternatives considered**: Infer from `discardedCards.length === 0` — rejected because it is fragile and conflates two semantically different states.

### Decision 3: Frontend round-end UX — transient banner

- **Decision**: Show a brief (2–3 s) dismissible overlay/banner after `round-ended` fires, displaying:
  - For **vett**: "Vett! [VettPlayerName] broke the round. [WinnerName] takes the pile."
  - For **clean round**: "Round complete. [WinnerName] leads next."
- **Rationale**: Players need to understand what happened before the next round starts. A timed auto-dismiss keeps flow fast.
- **Alternatives considered**: Inline text in `RoundTable` — rejected because `currentRound` becomes `null` immediately after `round-ended`, so there is no round snapshot to read.

### Decision 4: Next-starter waiting state UI

- **Decision**: When `roomSnapshot.currentRound === null && roomSnapshot.nextRoundStarterId !== null`, show "Waiting for [name] to start the next round…" in the `RoundTable` area.
- **Rationale**: Without this, the table goes blank between rounds with no feedback.
- **Scope note**: Only the first round is playable in this slice; between-round waiting state will be exercised properly in Slice 4. The component should still render correctly to avoid regressions.

### Decision 5: `useHand` hand refresh on vett (pile receiver)

- **Decision**: When the local player is the vett pile winner, their hand grows. The `roomSnapshot` already carries updated `cardCount` values for the public view. For the private hand, the pile winner must receive an updated hand via a new `hand-updated` socket event (or re-use `state-sync` sent targeted to the winner's socket).
- **Decision**: Re-emit a targeted `state-sync` to the pile-winner's socket immediately after vett resolution in the gateway.
- **Rationale**: `useHand` only trusts `hand-dealt` and `state-sync` for hand contents. The current vett code does not send any private hand update to the pile winner.
- **Alternatives considered**: Broadcast full hands to all — rejected (privacy: players must not see each other's hands).

### Decision 6: Test coverage

- **Decision**: Add new test cases to `backend/test/unit/domain/game.spec.ts` covering:
  1. Vett: pile awarded to highest led-suit card player (not the vett player)
  2. Vett: vett card included in the pile
  3. Vett: next round starter = pile winner (not the vett player)
  4. Multi-player vett: correct winner among multiple led-suit cards
  5. Clean round: no player receives cards
- **Rationale**: Existing test (line 154–180 of `game.spec.ts`) tests the buggy behaviour (awards to vett player). Tests must be updated to assert correct behaviour after the bug fix.

---

## Scope Boundary

This slice stops at: vett fires correctly, pile is awarded to the right player, UI shows the result, hand updates propagate. Multi-round chaining and player elimination remain Slice 4.
