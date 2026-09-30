# Tasks: Overlapping Hand Layout Redesign

**Input**: [amendments/hand-layout-redesign.md](./hand-layout-redesign.md)

**Amends**: [specs/001-cards-in-hand/plan.md](../plan.md)

**Scope**: Frontend-only. No backend, no shared types, no data model changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 = overlapping PlayerHand, US2 = unified OpponentHand)

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: The pure layout utility that both components will consume. Must exist before either component is touched.

- [x] T001 Create `computePeek(cardCount, containerWidth, cardWidth): number` in `frontend/src/utils/handLayout.ts`
- [x] T002 Add unit tests for `computePeek` edge cases (0 cards, 1 card, 26 cards at 1280 px wide) in `frontend/test/handLayout.spec.ts`

**Checkpoint**: `computePeek` passes all tests — component work can now begin

---

## Phase 2: User Story 1 — Overlapping PlayerHand (Priority: P1) 🎯

**Goal**: Replace the scrollable flex row in `PlayerHand` with an absolute-position fanned layout that always fits the footer without horizontal scroll.

**Independent Test**: Open the game with 2 players (~26 cards each). Confirm no horizontal scrollbar appears on the `PlayerHand` footer at any viewport ≥ 1280 px. Hover a card — it lifts upward (`translateY`). Rightmost card visually on top.

### Implementation

- [x] T003 [US1] Add a `containerRef` + `ResizeObserver` (via `useLayoutEffect`) to measure available footer width in `frontend/src/components/PlayerHand.tsx`
- [x] T004 [US1] Replace the `flex gap-2 overflow-x-auto` row with an absolutely-positioned container sized to `computePeek` output; set `zIndex: i` per card in `frontend/src/components/PlayerHand.tsx`
- [x] T005 [US1] Apply `hover:-translate-y-8 transition-transform duration-200 cursor-pointer` to each card wrapper in `frontend/src/components/PlayerHand.tsx`
- [x] T006 [US1] Remove `overflow-x-auto` and `shrink-0` classes from the outer container in `frontend/src/components/PlayerHand.tsx`

**Checkpoint**: PlayerHand displays correctly — no scroll, cards overlap, hover lifts the card

---

## Phase 3: User Story 2 — Unified OpponentHand (Priority: P1)

**Goal**: Replace the Tailwind `-space-x-8` hack in `OpponentHand` with the same absolute-position system for consistency (Constitution IV). Smaller card size (50×70 px), 20 px peek, no hover effect.

**Independent Test**: Open the game with 2+ players. Opponent hands display as overlapping face-down card backs. Card count badge is correct. No hover behaviour on opponent cards.

### Implementation

- [x] T007 [P] [US2] Add a `containerRef` + `useLayoutEffect` width measurement in `frontend/src/components/OpponentHand.tsx`
- [x] T008 [US2] Replace `-space-x-8` flex layout with absolute-position container using `computePeek` (20 px natural peek, 50 px cardWidth) in `frontend/src/components/OpponentHand.tsx`

**Checkpoint**: Both PlayerHand and OpponentHand use the unified layout system

---

## Phase 4: Polish & Cross-Cutting

- [x] T009 [P] Smoke-test at narrow desktop viewport (1280×720) with 26-card hand — confirm no overflow and peek compression kicks in
- [x] T010 [P] Update amendment doc status to `Implemented` in `frontend/src/components/` (add inline comment referencing `handLayout.ts`) — optional traceability note

---

## Dependencies & Execution Order

```
T001 (handLayout.ts) → T002 (tests)
                     ↓
T003 → T004 → T005 → T006   (PlayerHand, sequential within file)
T007 → T008                  (OpponentHand, can run in parallel with PlayerHand after T001)
                     ↓
T009, T010  (Polish, after all implementation)
```

### Parallel Opportunities

- **T003–T006** (PlayerHand) and **T007–T008** (OpponentHand) can be worked in parallel once T001 is done — they touch different files.
- **T009** and **T010** can run in parallel after all implementation tasks.

---

## Implementation Strategy

### MVP (Minimal shippable)

1. T001 — `handLayout.ts` utility
2. T003 → T006 — Fix `PlayerHand` (highest-impact; eliminates the scroll)
3. Validate: no scroll at 1280 px with 26 cards

### Full Delivery

4. T002 — unit tests for `computePeek`
5. T007 → T008 — Unify `OpponentHand`
6. T009 — Smoke-test across viewports

---

## Notes

- No backend changes. No shared type changes. No new npm packages.
- `ResizeObserver` is natively supported in all target browsers (Chrome, Firefox, Safari). No polyfill needed.
- The `effectivePeek` compression is purely CSS/math — no state management changes required.
- Tasks T003–T006 all edit the same file (`PlayerHand.tsx`) and must run sequentially.
