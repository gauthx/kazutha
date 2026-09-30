# Amendment: Overlapping Hand Layout

**Date**: 2026-09-30 | **Amends**: [plan.md](../plan.md) (section: UI — PlayerHand & OpponentHand)

---

## Problem

The current `PlayerHand` renders each card at full size (86×120 px) spaced 8–12 px apart in a single row. With a 52-card deck dealt among 2 players, a player holds ~26 cards — far wider than any desktop viewport. The `overflow-x-auto` scroll band that results is a UX regression (violates FR-012 / SC-004).

---

## Decision: Fanned / Overlapping Stack

Cards are laid out using **absolute positioning within a fixed-height container**. Each card is offset by a fixed `peek` amount (the visible strip of the card poking out from behind the next).

| Parameter | Decision | Rationale |
|---|---|---|
| Peek per card | **~35 px** | Comfortable overlap — like a real hand of cards |
| Hover behaviour | **Lift upward** (`translateY(-32px)`) | Consistent with existing hover UX |
| Stacking order (z-index) | **Left-to-right ascending** — rightmost on top | Natural deal order |
| Footer height | **Fixed** | No layout shift |
| Overflow fallback | **Dynamic peek compression** | Auto-shrinks peek so all cards always fit |
| OpponentHand | **Unified** with same approach, 20 px peek | Replaces inconsistent `-space-x-8` Tailwind hack |

---

## Layout Maths

```
effectivePeek   = min(35, (containerWidth - cardWidth) / (hand.length - 1))
containerNeeded = cardWidth + (hand.length - 1) * effectivePeek
```

`effectivePeek` compresses automatically so a 26-card hand fits any viewport ≥ 1280 px wide without scrolling.

---

## Affected Files

| File | Change |
|---|---|
| `frontend/src/components/PlayerHand.tsx` | Replace `flex gap-2 overflow-x-auto` with absolute-position fanned layout |
| `frontend/src/components/OpponentHand.tsx` | Replace `-space-x-8` with same absolute-position system (20 px peek, no hover) |
| `frontend/src/utils/handLayout.ts` | **New** — pure `computePeek(cardCount, containerWidth, cardWidth): number` |
| `frontend/test/handLayout.spec.ts` | **New** — unit tests for boundary cases (0 cards, 1 card, 26 cards at 1280 px) |

> `handLayout.ts` is extracted as a pure util to keep layout maths out of the component (Constitution I & V).

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Separation of Concerns | Pass | Layout maths in `handLayout.ts`; component handles only rendering |
| II. Justified Modularity | Pass | `handLayout.ts` earns its existence — independently testable, reused by both `PlayerHand` and `OpponentHand` |
| III. Encapsulated State | Pass | Container width via `ResizeObserver` scoped to component ref; no global state |
| IV. Consistency | Pass | Both hand components use the same positioning system |
| V. Low Complexity | Pass | `computePeek` is a single expression; no branching beyond a `Math.min` |
| VI. Clear Module Structure | Pass | New file placed in existing `utils/`; no new directories needed |
