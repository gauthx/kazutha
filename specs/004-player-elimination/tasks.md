# Tasks: Player Elimination

**Input**: Design documents from `specs/004-player-elimination/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/socket-events.md`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file paths

---

## Phase 1: Setup (Shared Contracts & Types)

**Purpose**: Update shared types across frontend and backend for spectator tracking and Kazhutha resolution.

- [x] T001 Update shared contracts to include spectator and Kazhutha fields in `shared/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model serialization and foundational domain infrastructure required before user stories.

**⚠️ CRITICAL**: Must complete before user story phases.

- [x] T002 Update `toSnapshot` in `backend/src/game/domain/game.ts` to include `isSpectator`, `finishPosition`, `kazhuthaPlayerId`, and `finishOrder`
- [x] T003 [P] Add unit tests for player spectator state and finish position serialization in `backend/test/unit/domain/player.spec.ts`

**Checkpoint**: Shared types and snapshot serialization ready. User story implementation can begin.

---

## Phase 3: User Story 1 - Player Empties Hand and Becomes Spectator (Priority: P1) 🎯 MVP

**Goal**: When a player plays their last card and the round resolves, they transition to spectator status, get skipped in turn rotation, and spectator UI reflects their status.

**Independent Test**: Simulate a 3-player trick where one player empties their hand. Verify the player is marked as a spectator, receives finish position 1, cannot play further cards, and is skipped in subsequent turn order.

### Tests for User Story 1

- [x] T004 [P] [US1] Unit test round-resolution elimination and spectator turn skipping in `backend/test/unit/domain/game.spec.ts`

### Implementation for User Story 1

- [x] T005 [US1] Refactor hand exhaustion in `backend/src/game/domain/game.ts` to evaluate elimination only after round resolution
- [x] T006 [US1] Ensure `getActiveTurnOrder` and new `Round` instances strictly exclude spectator players in `backend/src/game/domain/game.ts`
- [x] T007 [US1] Enforce spectator play prohibition by rejecting card plays from spectators with `NOT_YOUR_TURN` in `backend/src/game/domain/game.ts`
- [x] T008 [P] [US1] Update `frontend/src/components/PlayerHand.tsx` to render spectator state and disable card play interactions when local player has finished
- [x] T009 [P] [US1] Update `frontend/src/components/OpponentHand.tsx` to render finished badge and rank for spectator opponents

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Last Player Remaining Declared Kazhutha (Priority: P1)

**Goal**: When all but one player have finished their hands, terminate the game immediately, record the remaining player as Kazhutha, and broadcast final rankings.

**Independent Test**: Simulate a 2-player game where one player empties their hand. Verify that the game transitions to `FINISHED`, the remaining player is assigned as Kazhutha, and no new round is started.

### Tests for User Story 2

- [x] T010 [P] [US2] Unit test Kazhutha declaration on 2-player game resolution and vett hand-exhaustion in `backend/test/unit/domain/game.spec.ts`

### Implementation for User Story 2

- [x] T011 [US2] Implement comprehensive game over detection for clean rounds and vett rounds in `backend/src/game/domain/game.ts`
- [x] T012 [US2] Verify `backend/src/game/game.gateway.ts` broadcasts `room-update` and `round-ended` with `status: FINISHED` and `kazhuthaPlayerId`
- [x] T013 [P] [US2] Add Kazhutha announcement banner and finish order presentation in `frontend/src/components/GameTable.tsx` when room status is `FINISHED`

**Checkpoint**: User Stories 1 and 2 work together. The game terminates naturally with a declared Kazhutha.

---

## Phase 5: User Story 3 - Turn Order Integrity & Priority Starter (Priority: P2)

**Goal**: If the trick winner empties their hand on a clean round, the starter of the next round is the player who played the second-highest card of the led suit (or highest among players who still have cards). If $N$ players finish, the highest remaining card holder starts.

**Independent Test**: Set up a clean round where the player who plays the highest led-suit card runs out of cards. Confirm that the player who played the second-highest led-suit card (and still has cards) becomes `nextRoundStarterId`.

### Tests for User Story 3

- [x] T014 [P] [US3] Unit test second-highest and highest-remaining card player starter resolution in `backend/test/unit/domain/game.spec.ts`

### Implementation for User Story 3

- [x] T015 [US3] Implement priority starter selection in `backend/src/game/domain/game.ts` choosing the second-highest led-suit card player when the trick winner finishes
- [x] T016 [US3] Implement multi-elimination fallback in `backend/src/game/domain/game.ts` selecting the highest led-suit card holder among remaining active players when $N$ players finish

**Checkpoint**: All user stories functional and all edge-case starter priorities verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end scenario validation and test suite execution.

- [x] T017 Validate all scenarios from `specs/004-player-elimination/quickstart.md` using the automated test suite
- [x] T018 [P] Run full backend and frontend test suites and linters (`npm --prefix backend test` and `npm --prefix frontend test -- --run`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks all user stories.
- **Phase 3 (User Story 1)**: Depends on Phase 2 completion. Delivers MVP player elimination.
- **Phase 4 (User Story 2)**: Depends on Phase 2 and integrates with Phase 3 elimination checks.
- **Phase 5 (User Story 3)**: Depends on Phase 3 and Phase 4. Delivers priority trick starter selection.
- **Phase 6 (Polish)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational prerequisites only. No dependency on US2 or US3.
- **User Story 2 (P1)**: Depends on US1's elimination detection to trigger when active players $\le 1$.
- **User Story 3 (P2)**: Extends US1 round completion starter assignment with priority fallback.

---

## Parallel Opportunities

- **Phase 1 & 2**: `T003` (player unit tests) can run in parallel with `T002`.
- **Phase 3 (US1)**:
  - `T004` (test) can run in parallel with frontend tasks `T008` and `T009`.
  - Frontend tasks `T008` (`PlayerHand.tsx`) and `T009` (`OpponentHand.tsx`) can run in parallel.
- **Phase 4 (US2)**:
  - `T010` (test) and `T013` (`GameTable.tsx`) can run in parallel with backend implementation.
- **Phase 5 (US3)**:
  - `T014` (test) can run in parallel with implementation preparation.
- **Phase 6**:
  - `T018` can run in parallel with verification tasks.

---

## Parallel Example: User Story 1

```bash
# Launch tests and frontend tasks for User Story 1 together:
Task: "T004 [P] [US1] Unit test round-resolution elimination and spectator turn skipping in backend/test/unit/domain/game.spec.ts"
Task: "T008 [P] [US1] Update frontend/src/components/PlayerHand.tsx to render spectator state"
Task: "T009 [P] [US1] Update frontend/src/components/OpponentHand.tsx to render finished badge"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Execute Phase 1 (Setup: shared types).
2. Execute Phase 2 (Foundational: snapshot support).
3. Execute Phase 3 (User Story 1: empty hand -> spectator transition + turn skipping).
4. Run `npm --prefix backend test -- test/unit/domain/game.spec.ts` to validate MVP.

### Incremental Delivery

1. **Increment 1 (MVP)**: Players can run out of cards and spectate while other players continue.
2. **Increment 2**: Game terminates cleanly when 1 player remains, declaring Kazhutha.
3. **Increment 3**: Second-highest / priority starter selection when trick winner finishes.
4. **Increment 4**: End-to-end verification and regression suite.
