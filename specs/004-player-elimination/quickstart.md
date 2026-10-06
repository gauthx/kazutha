# Quickstart & Verification Guide: Player Elimination

**Feature**: 004-player-elimination  
**Status**: Completed

## Prerequisites

- Node.js 20+
- Repository dependencies installed (`backend` and `frontend`)

```bash
cd backend && npm test
cd ../frontend && npm test
```

---

## Validation Scenarios

### Scenario 1: Clean Round Elimination (3 Players)
**Objective**: Verify that when a player plays their last card in a clean (no-vett) round, they transition to a spectator and the next round starter is chosen from the remaining active players.

1. **Setup**:
   - 3 players: P1, P2, P3.
   - P1 has 1 card: A♠.
   - P2 has 2 cards: K♠, 2♥.
   - P3 has 2 cards: Q♠, 3♥.
2. **Action**:
   - P1 plays A♠ (leads round).
   - P2 plays K♠.
   - P3 plays Q♠.
3. **Expected Outcome**:
   - Round completes (all followed ♠).
   - A♠ is highest -> P1 would normally lead, but P1 has 0 cards -> P1 marked spectator with `finishPosition = 1`.
   - P2 played the second-highest card of the led suit (K♠) and has cards remaining -> P2 becomes next round starter (`nextRoundStarterId = P2`).
   - Active turn order for next round consists only of `[P2, P3]`.
   - P1's hand is empty and P1 cannot play cards.

---

### Scenario 2: Two-Player Game Over & Kazhutha Declaration
**Objective**: Verify that when the game reduces to 1 active player, the game terminates immediately and the remaining player is declared Kazhutha.

1. **Setup**:
   - 2 players: P1, P2.
   - P1 has 1 card: A♠.
   - P2 has 2 cards: K♠, 5♦.
2. **Action**:
   - P1 leads A♠.
   - P2 plays K♠.
3. **Expected Outcome**:
   - Clean round resolves.
   - P1 hand empties -> P1 marked finished (`finishPosition = 1`).
   - Only P2 remains active -> `checkGameOver()` triggers.
   - `roomSnapshot.status` transitions to `FINISHED`.
   - `roomSnapshot.kazhuthaPlayerId = P2.playerId`.
   - `roomSnapshot.finishOrder = [P1.playerId, P2.playerId]`.
   - `nextRoundStarterId` is null. No further rounds can be started.

---

### Scenario 3: Vett by Last Card Player
**Objective**: Verify that if a player with 1 card performs a Vett, they are eliminated as a spectator, while the highest led-suit player takes the pile and leads the next round.

1. **Setup**:
   - 3 players: P1, P2, P3.
   - P1 leads 10♥.
   - P2 plays K♥.
   - P3 has 1 card: 2♣ (no ♥).
2. **Action**:
   - P3 plays 2♣ (triggers Vett).
3. **Expected Outcome**:
   - Round terminates immediately.
   - Highest led suit is P2's K♥.
   - P2 receives all played cards (10♥, K♥, 2♣).
   - P3 has 0 cards -> P3 is marked spectator (`finishPosition = 1`).
   - P2 has cards and leads next round (`nextRoundStarterId = P2`).
   - Next round turn order includes `[P2, P1]`; P3 is skipped.

---

## Automated Test Command

To run the complete automated suite covering these scenarios:

```bash
# Backend unit & integration tests
npm --prefix backend test -- test/unit/domain/game.spec.ts

# All backend tests
npm --prefix backend test

# All frontend tests
npm --prefix frontend test -- --run
```
