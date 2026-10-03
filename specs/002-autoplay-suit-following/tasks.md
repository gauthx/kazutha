# Tasks: A-Spade Auto-play & Suit Following

**Input**: Design documents from `specs/002-autoplay-suit-following/`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data model**: [data-model.md](./data-model.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 = A♠ auto-play, US2 = suit following, US3 = clean round resolution)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend shared types and backend store with round-level data structures. All user stories depend on these.

- [x] T001 Add `RoundSnapshot`, `PlayedCardPublic`, `RoundStartedPayload`, `RoundUpdatePayload`, `RoundEndedPayload`, `PlayCardPayload` types and extend `RoomSnapshot` with `currentRound: RoundSnapshot | null` and `ErrorCode` with `'MUST_FOLLOW_SUIT' | 'NOT_YOUR_TURN' | 'CARD_NOT_IN_HAND'` in `shared/types.ts`
- [x] T002 Add `RoundState` and `PlayedCard` interfaces to `backend/src/game/game-store.service.ts` and extend `GameRoom` with `currentRound: RoundState | null` (default `null`)
- [x] T003 Extend `GameStoreService.toRoomSnapshot()` to embed `currentRound: RoundSnapshot | null` from `GameRoom.currentRound` in `backend/src/game/game-store.service.ts`

**Checkpoint**: Types compile cleanly — `npx tsc --noEmit` passes in both `backend/` and `frontend/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure round-engine domain module. Must exist before any service or gateway code touches rounds.

⚠️ **CRITICAL**: No user-story work can begin until this phase is complete.

- [x] T004 Create `backend/src/game/round-engine.ts` with pure function `compareRank(a: Rank, b: Rank): number` — returns positive if `a` outranks `b`, using the order `A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2`
- [x] T005 Add pure function `findAceOfSpades(players: PlayerInternal[]): string` to `backend/src/game/round-engine.ts` — returns `playerId` of the holder of `{ suit: 'SPADES', rank: 'A' }`
- [x] T006 Add pure function `buildTurnOrder(players: PlayerInternal[], starterPlayerId: string): string[]` to `backend/src/game/round-engine.ts` — returns clockwise array of `playerId` values starting from `starterPlayerId`, skipping no players (spectator skipping is Slice 4)
- [x] T007 Add pure function `createRound(starterPlayerId: string, turnOrder: string[], roundNumber: number, firstCard: Card): RoundState` to `backend/src/game/round-engine.ts` — initialises `RoundState` with `ledSuit` set from `firstCard.suit`, `playedCards` containing the first `PlayedCard`, and `currentTurnPlayerId` set to `turnOrder[1]` (second in order)
- [x] T008 Add pure function `validatePlay(round: RoundState, playerId: string, card: Card, hand: Card[]): 'ok' | 'NOT_YOUR_TURN' | 'MUST_FOLLOW_SUIT' | 'CARD_NOT_IN_HAND'` to `backend/src/game/round-engine.ts` — checks (1) correct turn, (2) card is in hand, (3) if player has led-suit cards, played card must match led suit
- [x] T009 Add pure function `applyPlay(round: RoundState, playerId: string, card: Card, nextTurnPlayerId: string): RoundState` to `backend/src/game/round-engine.ts` — returns new `RoundState` with card appended to `playedCards` and `currentTurnPlayerId` updated
- [x] T010 Add pure function `resolveRound(round: RoundState): { discardedCards: Card[]; nextStarterPlayerId: string }` to `backend/src/game/round-engine.ts` — identifies the `PlayedCard` with the highest-ranked led-suit card and returns its `playerId` as `nextStarterPlayerId`; all `playedCards` become `discardedCards`
- [x] T011 Add unit tests for all `round-engine.ts` functions in `backend/test/round-engine.spec.ts` covering: `compareRank` ordering, `findAceOfSpades` with A♠ in various positions, `validatePlay` for all four return values, `resolveRound` with multiple rank scenarios

**Checkpoint**: `cd backend && npx jest round-engine` — all tests pass

---

## Phase 3: User Story 1 — A♠ Auto-play on Game Start (Priority: P1) 🎯 MVP

**Goal**: When the host starts the game and cards are dealt, A♠ is auto-played server-side and all clients immediately see Round 1 in progress with spades as the led suit.

**Independent Test**: Two players join, host starts game. Within 2 seconds, both browser tabs show A♠ on the table, led suit = ♠, and the turn indicator shows the next player's turn — without any player clicking anything.

### Implementation

- [x] T012 [US1] Extend `GameService.startGame()` in `backend/src/game/game.service.ts` to: (1) call `findAceOfSpades`, (2) remove A♠ from that player's hand, (3) call `buildTurnOrder` and `createRound` to produce `RoundState`, (4) assign `room.currentRound = roundState`
- [x] T013 [US1] Inject `GameGateway`'s `server: Server` into `GameService` (or return the round payload from `startGame` for the gateway to broadcast) and emit `round-started` with `{ roomSnapshot, autoPlayedCard: { playerId, card: AceOfSpades } }` to the room in `backend/src/game/game.gateway.ts`
- [x] T014 [US1] Update `GameGateway.handleConnection` state-sync path in `backend/src/game/game.gateway.ts` so reconnecting players receive `roomSnapshot.currentRound` correctly (already handled if `toRoomSnapshot` was extended in T003)
- [x] T015 [P] [US1] Update `frontend/src/hooks/useRoom.ts` to listen for `round-started` socket event and merge `roomSnapshot` (including `currentRound`) into React state
- [x] T016 [P] [US1] Create `frontend/src/components/RoundTable.tsx` — displays the played cards area and led-suit indicator derived from `roomSnapshot.currentRound`; renders nothing (or a "Waiting for round..." placeholder) when `currentRound` is null
- [x] T017 [P] [US1] Create `frontend/src/components/TurnIndicator.tsx` — displays a banner showing whose turn it is (`roomSnapshot.currentRound?.currentTurnPlayerId`); highlights "Your Turn" vs "Waiting for [name]" derived from `localPlayerId`
- [x] T018 [US1] Integrate `RoundTable` and `TurnIndicator` into `frontend/src/components/GameTable.tsx` — render them in the game table layout above the player hand

**Checkpoint**: Quickstart Scenario 1 passes — A♠ auto-appears on both clients within 2 seconds of "Start Game"

---

## Phase 4: User Story 2 — Players Must Follow the Led Suit (Priority: P1)

**Goal**: Players can play cards on their turn. If they hold cards of the led suit, off-suit cards are visually disabled and any attempt to play them is rejected by the server with `MUST_FOLLOW_SUIT`.

**Independent Test**: On any player's turn, if they hold led-suit cards, clicking a non-led-suit card does nothing (greyed out). Playing a led-suit card succeeds — it appears on the table, the player's hand shrinks, and the turn advances.

### Implementation

- [x] T019 [US2] Add `@SubscribeMessage('play-card')` handler to `GameGateway` in `backend/src/game/game.gateway.ts` — calls `GameService.playCard(roomCode, playerId, card)` and returns ack `{ ok: true }` or `{ ok: false, code, message }`
- [x] T020 [US2] Add `GameService.playCard(roomCode: number, playerId: string, card: Card)` method in `backend/src/game/game.service.ts` — calls `validatePlay`, rejects on failure, calls `applyPlay` on success, updates `room.currentRound`, removes card from player's hand, emits `round-update` broadcast via gateway
- [x] T021 [US2] Emit `round-update` with updated `roomSnapshot` to all room sockets after every successful `play-card` in `backend/src/game/game.gateway.ts`
- [x] T022 [P] [US2] Update `frontend/src/hooks/useRoom.ts` to listen for `round-update` and merge updated `roomSnapshot` into state
- [x] T023 [P] [US2] Extend `frontend/src/components/PlayerHand.tsx` — compute `isPlayable(card)` derived from `roomSnapshot.currentRound` and `localPlayerId` (per the pattern in `research.md`); apply greyed-out visual style (`opacity-40 cursor-not-allowed`) and disable click handler for unplayable cards
- [x] T024 [US2] Wire card-click in `frontend/src/components/PlayerHand.tsx` to emit `play-card` socket event with ack callback; on `ok: false` show error via existing `ErrorBanner` (or a transient toast); apply `isSubmitting` flag to prevent double-click while ack is pending
- [x] T025 [US2] Update `frontend/src/hooks/useHand.ts` to remove the played card from local hand state on successful ack (optimistic removal for the local player only, consistent with server confirmation)

**Checkpoint**: Quickstart Scenarios 2 & 3 pass — off-suit cards blocked, on-suit cards play successfully, out-of-turn rejected

---

## Phase 5: User Story 3 — Clean Round Resolution (Priority: P1)

**Goal**: When all active players have played a card of the led suit, the round ends cleanly — played cards disappear, the highest-ranked led-suit card's holder leads the next round.

**Independent Test**: In a 2-player game, both players follow suit. After the second card is played, the table clears, no hand grows, the correct player leads Round 2.

### Implementation

- [x] T026 [US3] Extend `GameService.playCard()` in `backend/src/game/game.service.ts` — after appending the played card, check if `playedCards.length === turnOrder.length`; if so, call `resolveRound`, set `room.currentRound = null`, emit `round-ended` with `{ discardedCards, nextStarterPlayerId, roomSnapshot }`
- [x] T027 [US3] After emitting `round-ended`, immediately start the next round in `GameService` in `backend/src/game/game.service.ts` — call `buildTurnOrder` and `createRound` with `nextStarterPlayerId` leading (no card played yet — `currentTurnPlayerId` = `nextStarterPlayerId`, `ledSuit` not yet set), set `room.currentRound`, emit `round-started` to room
- [x] T028 [P] [US3] Update `frontend/src/hooks/useRoom.ts` to listen for `round-ended` event — update `roomSnapshot` (clears `currentRound`) and update hand sizes in the snapshot
- [x] T029 [P] [US3] Update `RoundTable` in `frontend/src/components/RoundTable.tsx` to clear the played-cards area and show a "Round resolved" flash (or simply empty state) when `currentRound` is `null` between rounds
- [x] T030 [US3] Update `TurnIndicator` in `frontend/src/components/TurnIndicator.tsx` to handle the `currentRound === null` between-rounds state — show "Starting next round…" or similar

**Checkpoint**: Quickstart Scenarios 4 & 5 pass — clean round resolves, correct player leads next round, both clients consistent

---

## Phase 6: Polish & Cross-Cutting

- [x] T031 [P] Run TypeScript type-check across both projects: `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit` — fix any remaining type errors
- [x] T032 [P] Run full backend test suite: `cd backend && npx jest` — all tests pass including round-engine and any existing tests
- [x] T033 [P] Run full frontend test suite: `cd frontend && npx vitest run` — all tests pass
- [ ] T034 Run Quickstart Scenario 6 (reconnection) manually — reconnecting player sees correct round state on rejoin
- [ ] T035 Run Quickstart Scenario 5 (state consistency) — both browser tabs stay in sync across 5 consecutive rounds

---

## Dependencies & Execution Order

```
T001 → T002 → T003  (shared types + store extension)
                ↓
T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011  (round-engine, sequential)
                ↓
┌─────────────────────────────┐   ┌──────────────────────────────────┐
│ US1: T012 → T013 → T014     │   │ US1 frontend (parallel with ^):  │
│ (backend auto-play)         │   │ T015 [P], T016 [P], T017 [P]     │
│                             │   │ then T018 (integrates all three)  │
└─────────────────────────────┘   └──────────────────────────────────┘
                ↓ (US1 checkpoint cleared)
┌─────────────────────────────┐   ┌──────────────────────────────────┐
│ US2: T019 → T020 → T021     │   │ US2 frontend (parallel with ^):  │
│ (backend play-card)         │   │ T022 [P], T023 [P]               │
│                             │   │ then T024 → T025                 │
└─────────────────────────────┘   └──────────────────────────────────┘
                ↓ (US2 checkpoint cleared)
┌─────────────────────────────┐   ┌──────────────────────────────────┐
│ US3: T026 → T027            │   │ US3 frontend (parallel with ^):  │
│ (backend round resolution)  │   │ T028 [P], T029 [P], T030         │
└─────────────────────────────┘   └──────────────────────────────────┘
                ↓ (US3 checkpoint cleared)
T031 [P], T032 [P], T033 [P] → T034 → T035  (Polish)
```

### User Story Dependencies

- **US1**: Depends on Foundational phase (T001–T011). No dependency on US2 or US3.
- **US2**: Depends on US1 backend (A♠ establishes Round 1 with a `currentRound` to play into). Frontend tasks can start in parallel once `round-update` event exists.
- **US3**: Depends on US2 (`playCard` must exist to reach a full round). Frontend tasks can start in parallel once `round-ended` event exists.

### Within Each User Story

- Backend service tasks before gateway tasks (service logic first, then wiring)
- Frontend hook updates before component updates (state must exist before UI reads it)
- `RoundTable` and `TurnIndicator` creation [P] before `GameTable` integration (T018)

---

## Parallel Example: Foundational Phase

```
# All round-engine functions are in the same file — write sequentially:
T004 compareRank → T005 findAceOfSpades → T006 buildTurnOrder →
T007 createRound → T008 validatePlay → T009 applyPlay → T010 resolveRound → T011 tests
```

## Parallel Example: User Story 1

```
# Backend and frontend can proceed in parallel once T011 passes:
[Backend]  T012 → T013 → T014
[Frontend] T015 [P] | T016 [P] | T017 [P]  (all different files)
           ↓
           T018 (integrates RoundTable + TurnIndicator into GameTable)
```

## Parallel Example: User Story 2

```
[Backend]  T019 → T020 → T021
[Frontend] T022 [P] | T023 [P]  (different files)
           ↓
           T024 → T025  (same file — sequential)
```

---

## Implementation Strategy

### MVP (Minimal Shippable — US1 Only)

1. T001–T003 — shared types + store
2. T004–T011 — round-engine (foundational)
3. T012–T018 — A♠ auto-play, RoundTable, TurnIndicator
4. **STOP and VALIDATE**: Quickstart Scenario 1 — A♠ appears within 2 s, no player input needed

### Full Delivery

5. T019–T025 — `play-card`, suit enforcement (US2)
6. **VALIDATE**: Quickstart Scenarios 2 & 3
7. T026–T030 — round resolution (US3)
8. **VALIDATE**: Quickstart Scenarios 4 & 5
9. T031–T035 — Polish + full suite

### Parallel Team Strategy

- **Developer A**: T001–T011 (types + round-engine) → T012–T014, T019–T021, T026–T027 (backend)
- **Developer B**: T015–T018 (US1 frontend) → T022–T025 (US2 frontend) → T028–T030 (US3 frontend)

---

## Notes

- All `round-engine.ts` functions are pure — no NestJS decorators, no DI, no imports from NestJS. Jest can test them without the full NestJS bootstrap.
- `RoundState.currentTurnPlayerId` is the single source of truth for whose turn it is — no local state copies on the frontend.
- The between-rounds state (`currentRound === null`) is intentional and must be handled gracefully in all UI components.
- Vett (playing off-suit when you have no led-suit cards) is **not** an error in this slice — `validatePlay` returns `'ok'` in that case. Vett resolution logic belongs to Slice 3.
- Tasks T003–T010 all touch different aspects of the same files — read the task description carefully before editing.
