# Quickstart Validation Guide: A-Spade Auto-play & Suit Following

**Feature**: Slice 2 | **Prerequisite**: Slice 1 fully deployed and working

---

## Prerequisites

- Slice 1 running: `cd backend && npm run start:dev` + `cd frontend && npm run dev`
- At least 2 browser tabs open on `http://localhost:5173`
- No existing rooms in server memory (restart backend if needed)

---

## Scenario 1 — A♠ Auto-play on Game Start

**Validates**: FR-001, FR-002, FR-003, SC-001

1. Tab A: Create a room (enter display name → "Create Room"). Note the room code.
2. Tab B: Join the room (enter a different display name + room code → "Join Room").
3. Tab A (host): Click **Start Game**.
4. **Expected within 2 seconds**:
   - Both tabs transition to the game table screen.
   - The table shows **A♠** already played (in the played-cards area).
   - The led suit indicator shows **♠ Spades**.
   - One player's hand is visibly missing A♠; the other player's hand is unchanged.
   - The turn indicator shows it is the **next player's turn** (not the A♠ holder's).
5. **Verify** that no player was required to click anything to play A♠.

---

## Scenario 2 — Suit-Following Enforcement (Player Has Led Suit)

**Validates**: FR-005, FR-006, SC-002

1. Continue from Scenario 1. It is now Player B's turn with spades as the led suit.
2. Identify a non-spade card in Player B's hand.
3. Attempt to click that non-spade card.
4. **Expected**:
   - The card is **greyed out / unclickable** in the UI (client pre-filter).
   - If a direct socket call bypasses the UI, the server returns `{ ok: false, code: 'MUST_FOLLOW_SUIT' }` and an error message is shown.
   - The round state is **unchanged** — no card appears on the table, the turn remains Player B's.
5. Click a **spade card** in Player B's hand.
6. **Expected**:
   - The spade card appears on the table alongside A♠.
   - Player B's hand no longer contains that card.
   - The turn advances to the next player.

---

## Scenario 3 — Out-of-Turn Rejection

**Validates**: FR-011

1. During an active round, identify the player whose turn it is **not**.
2. Have that player attempt to play any card.
3. **Expected**:
   - Server ack returns `{ ok: false, code: 'NOT_YOUR_TURN' }`.
   - An error message is displayed to that player.
   - Round state is unchanged — the correct player's turn indicator persists.

---

## Scenario 4 — Clean Round Resolution (No Vett)

**Validates**: FR-007, FR-008, FR-009, SC-003, SC-005

1. Run a 2-player game to the point where both players have played a card in the current round (both following suit).
2. After the second card is played:
3. **Expected within 1 second**:
   - The played-cards area **clears** — no cards are visible on the table.
   - Neither player's hand increases in size (cards are discarded, not given to anyone).
   - The game identifies the player who played the **higher-ranked spade** (A > K > Q > … > 2).
   - A new round begins with that player as the leader.
   - The turn indicator shows **that player's turn**.
   - The new round's led suit is `null` / empty until they play their first card.

---

## Scenario 5 — State Consistency Across Clients

**Validates**: SC-004

1. After any card play, immediately compare **both browser tabs**.
2. **Expected**:
   - Both tabs show the same cards on the table.
   - Both tabs show the same player as the current turn holder.
   - Both tabs reflect the same hand sizes for all players.
   - Discrepancy should never exceed 1 second after any game event.

---

## Scenario 6 — Reconnection Restores Round State

**Validates**: FR-003 (state-sync extension)

1. During an active round, refresh one player's browser tab.
2. The player is prompted to re-enter room code and display name (Slice 1 rejoin flow).
3. **Expected**:
   - After rejoining, the game table shows the **current round state** accurately (played cards, led suit, whose turn).
   - The reconnected player's hand is correct (contains only unplayed cards).
   - If it was their turn when they disconnected, the turn indicator correctly reflects the current state (turn may have been skipped — that is acceptable for this slice).

---

## Reference

- Socket event payloads: [contracts/socket-events.md](./contracts/socket-events.md)
- Entity definitions: [data-model.md](./data-model.md)
- Game rules: [game_rules.md](../../game_rules.md)
