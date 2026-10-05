# Quickstart Validation Guide: Vett (Round Breaking) — Slice 3

## Prerequisites

- Slices 1 and 2 are implemented and passing their tests
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- A minimum of 2 browser tabs / sessions (representing 2 players)

---

## A. Automated Unit Tests (Backend)

Run the backend unit tests to validate vett logic in isolation:

```bash
cd backend
npx vitest run test/unit/domain/game.spec.ts
```

### Expected outcomes

| Test | Expected |
|---|---|
| Vett: pile awarded to highest led-suit card player | ✅ Pass — pile winner is **not** the vett player |
| Vett: vett card included in pile | ✅ Pass — winner's card count = (hand before) - 1 + (all round cards including vett card) |
| Vett: next starter = pile winner | ✅ Pass — `nextRoundStarterId` = pile winner ID |
| Vett: round immediately ends (no further players play) | ✅ Pass — `roundEnded: true` returned after vett play |
| Clean round: no player receives cards | ✅ Pass — all players' card counts decrease by 1 each |
| Clean round: next starter = highest-card player | ✅ Pass — `nextStarterPlayerId` = highest-card player ID |
| MUST_FOLLOW_SUIT: rejected when player has led suit | ✅ Pass — `GameError` with code `MUST_FOLLOW_SUIT` |

---

## B. Manual End-to-End Validation

### Setup

1. Open 2 browser tabs, both at `http://localhost:5173`
2. Tab 1: Create a room → note room code
3. Tab 2: Join the room using the room code
4. Tab 1: Start the game

### Scenario 1 — Vett Path

**Goal**: Verify that a vett correctly ends the round and awards the pile.

**How to set up a vett**: With only 2 players, deal is uneven (one player gets 27 cards, one gets 25). A♠ holder auto-plays. The other player plays a card. If they have no spades, it's a vett.

**Steps (with 2 players — arrange so P2 has no spades)**:

1. Game starts → A♠ auto-played by P1. Led suit: ♠
2. Switch to Tab 2 (P2). If P2 has spades, verify only spades are highlighted/playable
3. If P2 has no spades → all cards are playable → play any card
4. **Verify**:
   - [ ] A round-end banner appears: "Vett! [P2 name] broke the round. [P1 name] takes the pile."
   - [ ] P1's card count increases by 2 (received A♠ + vett card)
   - [ ] P2's card count decreases by 1 (played vett card)
   - [ ] Table shows "Waiting for [P1 name] to start the next round…"

### Scenario 2 — Clean Round Path

**Goal**: Verify all players follow suit → cards discarded.

**Steps (with 2 players, both holding spades)**:

1. Game starts → A♠ auto-played by P1. Led suit: ♠
2. P2 plays a spade → round ends cleanly (both played spades)
3. **Verify**:
   - [ ] A round-end banner appears: "Round complete. [P1 name] leads next." (P1 had A♠ — highest)
   - [ ] Both players' card counts decrease by 1
   - [ ] No player's count increased
   - [ ] Table shows "Waiting for [P1 name] to start the next round…"

### Scenario 3 — Suit-Lock Enforcement

**Steps**:

1. P1 leads with any suit (round 1 = spades via A♠)
2. Switch to P2's tab. P2 has spades in hand.
3. Click a non-spade card
4. **Verify**:
   - [ ] Non-spade cards are greyed out / unclickable
   - [ ] Only spade cards show hover effect
   - [ ] Server rejects any out-of-suit play (if attempted via devtools): returns `MUST_FOLLOW_SUIT` error

---

## C. Key Invariants to Check

| Invariant | How to Check |
|---|---|
| Total card count across all players is always 52 minus discarded | Sum `cardCount` of all players in `roomSnapshot.players`; add known discarded cards |
| Only the next-round starter can play the opening card | Try clicking a card in the non-starter's tab while waiting for a round start — should be greyed out |
| Pile winner receives exactly: all cards played before vett + the vett card | Compare pile winner's card count before and after round |
| `currentRound` is `null` between rounds | Log `roomSnapshot.currentRound` in browser console after `round-ended` event |

---

## D. References

- [Socket event contracts](./contracts/socket-events.md)
- [Data model](./data-model.md)
- [Spec](./spec.md)
- Backend entry point: [`backend/src/game/game.gateway.ts`](../../backend/src/game/game.gateway.ts)
- Game logic: [`backend/src/game/domain/game.ts`](../../backend/src/game/domain/game.ts)
- Round logic: [`backend/src/game/domain/round.ts`](../../backend/src/game/domain/round.ts)
- Frontend hand: [`frontend/src/hooks/useHand.ts`](../../frontend/src/hooks/useHand.ts)
- Frontend room: [`frontend/src/hooks/useRoom.ts`](../../frontend/src/hooks/useRoom.ts)
