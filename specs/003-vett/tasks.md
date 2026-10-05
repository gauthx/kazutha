# Tasks: Vett (Round Breaking) — Slice 3

**Input**: Design documents from `/specs/003-vett/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/socket-events.md`, `research.md`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: Unit tests are included to verify critical game engine rules (vett mechanics and clean rounds) in accordance with the project testing strategy and quickstart guide.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Contracts)

**Purpose**: Update shared definitions and contracts across frontend and backend

- [X] T001 Update `RoundEndedPayload` interface in `shared/types.ts` to include `isVett: boolean` and `pileWinnerPlayerId: string | null`

---

## Phase 2: Foundational (Core Game Engine Fix & Socket Emission)

**Purpose**: Core logic and transport infrastructure that MUST be complete before UI user stories can be fully functional

**⚠️ CRITICAL**: Foundational game engine fix and socket handling for vett resolution

- [X] T002 [P] Update `PlayCardResult` interface in `backend/src/game/domain/game.ts` to include optional `pileWinnerPlayerId?: string`
- [X] T003 Fix vett pile winner resolution in `backend/src/game/domain/game.ts` to award pile to highest led-suit player and assign them as next starter
- [X] T004 Update `handlePlayCard` in `backend/src/game/game.gateway.ts` to broadcast extended `round-ended` payload and unicast `state-sync` to the pile winner's socket

**Checkpoint**: Backend game engine and gateway properly resolve and emit vett events with correct pile allocation.

---

## Phase 3: User Story 1 & 2 - Vett Breaks Round & Pile Winner Takes Cards (Priority: P1) 🎯 MVP

**Goal**: When a player has no led suit, playing any card immediately ends the round. The highest led-suit card player collects all played cards into their hand, and all players see updated card counts and round status.

**Independent Test**: Simulate a round where a player without the led suit plays off-suit. Verify the round terminates immediately, cards are given to the highest led-suit player, and the pile winner's private hand updates.

### Tests for User Story 1 & 2

- [X] T005 [P] [US1] Unit test vett round breaking and rejection of off-suit play when holding led suit in `backend/test/unit/domain/game.spec.ts`
- [X] T006 [P] [US2] Unit test pile redistribution to highest led-suit player (including vett card) in `backend/test/unit/domain/game.spec.ts`

### Implementation for User Story 1 & 2

- [X] T007 [US1] Update `handleRoundEnded` in `frontend/src/hooks/useRoom.ts` to track and expose `roundResult` (`isVett`, `pileWinnerPlayerId`, `nextStarterPlayerId`)
- [X] T008 [P] [US2] Create `RoundResultBanner.tsx` in `frontend/src/components/RoundResultBanner.tsx` to announce vett vs clean round and pile winner
- [X] T009 [US2] Integrate `RoundResultBanner` into `frontend/src/components/GameTable.tsx` and `frontend/src/pages/GamePage.tsx`

**Checkpoint**: At this point, User Story 1 and 2 deliver the core MVP: vett ends the round and pile is visibly awarded to the correct player.

---

## Phase 4: User Story 3 - Pile Winner Leads Next Round (Priority: P2)

**Goal**: The player who took the pile after a vett is designated as the starter for the subsequent round and presented with the turn indicator.

**Independent Test**: After a vett concludes, verify `nextRoundStarterId` matches the pile winner, and the table indicates they are to play next.

### Tests for User Story 3

- [X] T010 [P] [US3] Unit test next round starter assignment for vett-resolved round in `backend/test/unit/domain/game.spec.ts`

### Implementation for User Story 3

- [X] T011 [US3] Update between-round display in `frontend/src/components/RoundTable.tsx` to show "Waiting for [Starter] to start the next round..." when `currentRound` is null and `nextRoundStarterId` is set

**Checkpoint**: Round transition logic is complete and visible to all players.

---

## Phase 5: User Story 4 - Clean Round (No Vett) (Priority: P2)

**Goal**: When all active players follow suit, cards are discarded face-down (no player receives them) and the highest-card player leads the next round.

**Independent Test**: Arrange a round where all players play on-suit cards. Verify cards are discarded without hand accumulation and highest card player leads next.

### Tests for User Story 4

- [X] T012 [P] [US4] Unit test clean round resolution (card discard without pile accumulation, highest card starts next) in `backend/test/unit/domain/game.spec.ts`

### Implementation for User Story 4

- [X] T013 [US4] Verify and ensure `RoundResultBanner.tsx` in `frontend/src/components/RoundResultBanner.tsx` displays clean round outcome ("Round complete. [Player] leads next")

**Checkpoint**: Both vett and clean-round paths are fully functional, tested, and visually distinct.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, linting, and regression checks across both projects

- [X] T014 [P] Run backend unit test suite via `npm --prefix backend run test`
- [X] T015 [P] Run frontend build and lint checks via `npm --prefix frontend run build`
- [X] T016 Validate E2E scenarios according to `specs/003-vett/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — blocks all user story implementation
- **User Stories (Phase 3 - Phase 5)**:
  - Phase 3 (US1 & US2): Depends on Foundational completion (T002, T003, T004)
  - Phase 4 (US3): Depends on Phase 3
  - Phase 5 (US4): Depends on Phase 3
- **Polish (Phase 6)**: Depends on all user story phases complete

### Within Each User Story

- Unit tests written/updated and verified against requirements
- Domain logic precedes UI integrations
- Component creation before integration in pages

### Parallel Opportunities

- T001 (Setup) and T002 (Foundational types)
- T005 & T006: Backend unit tests for US1 & US2
- T008 (RoundResultBanner component creation) can be developed in parallel with backend tests
- T010 & T012: Unit tests for US3 & US4
- T014 & T015: Backend testing and frontend build checks

---

## Parallel Example: User Stories 1 & 2

```bash
# Launch test updates in parallel:
Task: "Unit test vett round breaking in backend/test/unit/domain/game.spec.ts"
Task: "Unit test pile redistribution in backend/test/unit/domain/game.spec.ts"

# Launch frontend component creation while tests run:
Task: "Create RoundResultBanner.tsx in frontend/src/components/RoundResultBanner.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Shared type contract (`shared/types.ts`)
2. Complete Phase 2: Bug fix in `backend/src/game/domain/game.ts` and socket gateway delivery
3. Complete Phase 3: Tests and UI feedback for vett breaking and pile accumulation
4. **STOP and VALIDATE**: Verify vett mechanic end-to-end (MVP)

### Incremental Delivery

1. Foundation ready (Phase 1 & 2)
2. Add US1 & US2 (Vett mechanic & Pile acquisition) → MVP complete
3. Add US3 (Next round lead UX) → Smooth round transition
4. Add US4 (Clean round completion) → Full round lifecycle parity
5. Polish & Verification (Phase 6)

---

## Notes

- Every task strictly follows `- [ ] [ID] [P?] [Story?] Description with file path`
- In accordance with the spec caveat, only the first round is currently playable in practice; multi-round state handling sets the stage for Slice 4 (Player Elimination)
