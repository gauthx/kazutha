# Quickstart Validation Guide: Cards in Hand (Slice 1)

**Date**: 2026-09-23
**Feature**: specs/001-cards-in-hand
**Purpose**: Prove the feature works end-to-end after implementation. Not a tutorial — follow this after both servers are running.

---

## Prerequisites

- Node.js 20+ installed
- Two browser windows or tabs (to simulate two players)
- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:5173`

### Start backend
```bash
cd backend
npm install
npm run start:dev
```

Expected output: `NestJS application started on port 3001`

### Start frontend
```bash
cd frontend
npm install
npm run dev
```

Expected output: Vite dev server ready at `http://localhost:5173`

---

## Scenario 1: Create and Join a Room

**Goal**: Verify room creation, real-time lobby updates, and the join-ack flow.

### Steps

**Browser A (Host)**:
1. Open `http://localhost:5173`
2. Enter display name `Alice`
3. Click **Create Room**
4. Note the 6-character room code displayed (e.g. `X3KPQ7`)
5. Verify: lobby shows `Alice` as the only player; "Start Game" button is disabled

**Browser B (Guest)**:
6. Open `http://localhost:5173` in a second window
7. Enter display name `Bob`
8. Enter the room code from step 4
9. Click **Join Room**

**Expected outcomes**:
- Browser A lobby updates in real time to show both `Alice` and `Bob` without a page reload
- Browser B shows the lobby with both players
- Browser A's "Start Game" button becomes enabled
- Browser B has no "Start Game" button (not the host)

**Verify in browser console** (both windows):
- No errors in the console
- `join-ack` event received with a `playerId` value (check Network > WS tab)
- `room-update` event received after Bob joins

---

## Scenario 2: Start the Game — Cards Are Dealt

**Goal**: Verify shuffling, dealing, and the privacy of each player's hand.

### Steps (continuing from Scenario 1)

**Browser A (Alice)**:
1. Click **Start Game**

**Expected outcomes**:
- Both browsers navigate from the lobby to the game table simultaneously
- Browser A shows Alice's cards face-up
- Browser B shows Bob's cards face-up
- Alice and Bob have **different** cards
- Alice's view shows Bob's hand as face-down card backs with a count

### Verify dealing correctness

Open the browser console on either window and check the `hand-dealt` event payload. Verify:
- Alice's hand has 26 cards (26 each for 2 players)
- Bob's hand has 26 cards
- No card appears in both hands (check for duplicates: collect all `suit+rank` values from both hands — the set size should equal 52)

---

## Scenario 3: Three-Player Deal Distribution

**Goal**: Verify uneven dealing when 52 does not divide evenly.

### Steps

1. Repeat Scenario 1 with three players: Alice, Bob, Carol
2. Alice clicks **Start Game**

**Expected outcomes**:
- Alice: 18 cards
- Bob: 17 cards
- Carol: 17 cards
- Total: 52 cards (no duplicates)

---

## Scenario 4: Reconnection After Refresh

**Goal**: Verify a player's hand is restored after a tab refresh.

### Steps (after Scenario 2, mid-game)

**Browser B (Bob)**:
1. Refresh the browser tab (`Cmd+R` / `F5`)

**Expected outcomes**:
- Browser B briefly shows a loading/reconnecting state
- Within 5 seconds: Bob's game table is restored with the same hand he had before the refresh
- Browser A's view shows Bob's card count unchanged
- No error messages appear on either screen

**Verify in backend logs**: a `state-sync` event should be emitted to Bob's new socket ID.

---

## Scenario 5: Error Handling

**Goal**: Verify error cases are surfaced correctly to the user.

### 5a: Invalid room code

1. Open a fresh browser window
2. Enter any display name, enter room code `ZZZZZZ`
3. Click **Join Room**
4. Expected: error message "Room not found" displayed to the user (not a browser crash)

### 5b: Join a game already in progress

1. Repeat Scenario 1 and Scenario 2 (two players, game started)
2. Open a third browser window
3. Try to join the same room code
4. Expected: error message "Game already in progress"

### 5c: Start game with only one player

1. Create a room; do not add a second player
2. Attempt to click "Start Game" (button should be disabled)
3. If UI guard is bypassed, expected: error from server "Not enough players"

---

## Scenario 6: Run Automated Tests

**Backend**:
```bash
cd backend
npm run test
```
Expected: all tests pass. Key tests to exist:
- `DeckService`: `createDeck()` returns 52 unique cards
- `DeckService`: `shuffleDeck()` returns all 52 cards in a different order
- `DeckService`: `dealCards(deck, 4)` returns 4 hands of 13 cards with no duplicates
- `GameStoreService`: room creation, player join, player eviction after grace period
- `RoomCodeUtil`: generated codes are 6 characters from the valid alphabet

**Frontend**:
```bash
cd frontend
npm run test
```
Expected: all tests pass. Key tests to exist:
- Card code mapping: `{ suit: 'HEARTS', rank: 'A' }` maps to `'Ah'`
- `PlayerHand` component renders the correct number of face-up cards
- `OpponentHand` component renders face-down card backs with the correct count

---

## Reference

- Data model: [data-model.md](./data-model.md)
- Event contracts: [contracts/socket-events.md](./contracts/socket-events.md)
- Spec: [spec.md](./spec.md)
