# Implementation Plan: Vett (Round Breaking)

**Branch**: `003-vett` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-vett/spec.md`

## Summary

Implement the **vett** mechanic: when a player has no card of the led suit they play any card, immediately ending the round. The player who played the **highest-ranked led-suit card before the vett** collects all played cards (including the vett card) and leads the next round. A complementary path — clean round with no vett — discards all played cards and determines the next leader by highest-card rank. 

A critical **backend bug** is the primary deliverable: the existing vett branch in `Game.playCard()` incorrectly awards the pile to the vett player; it must be fixed to award to the highest led-suit-card player. Supporting changes include extending the `RoundEndedPayload` type, emitting a targeted `state-sync` to the pile winner, and adding frontend round-result feedback.

## Technical Context

**Language/Version**: TypeScript 6.0 (backend NestJS 12 + frontend React 19 + Vite 8)

**Primary Dependencies**: NestJS WebSocket Gateway (Socket.IO 4.8), React 19, Tailwind CSS 4, `@heruka_urgyen/react-playing-cards`

**Storage**: In-memory game state (server RAM); no database

**Testing**: Vitest (both backend and frontend)

**Target Platform**: Node.js server + browser (desktop-first)

**Project Type**: Real-time multiplayer web game (backend + frontend monorepo)

**Performance Goals**: Round-end broadcast delivered to all clients within 1 second under normal network conditions (per SC-004)

**Constraints**: Game state is ephemeral (no persistence); all card counts must remain consistent (52 - discarded = in hands at all times)

**Scale/Scope**: 2–6 players per room; single-server in-memory store

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| **I. Separation of Concerns** | ✅ Pass | Game logic stays in `domain/game.ts`; gateway handles only I/O; frontend UI components receive props only |
| **II. Justified Modularity** | ✅ Pass | No new modules added; vett fix is a behaviour correction inside existing functions; `RoundResult` is a frontend-only local type, not a new module |
| **III. Encapsulated State** | ✅ Pass | `Game` owns mutable state; `useHand` and `useRoom` own their respective React state slices; no global mutation |
| **IV. Consistency** | ✅ Pass | Naming follows existing conventions (`pileWinnerPlayerId` matches `nextStarterPlayerId` style; `isVett` matches `roundEnded` style) |
| **V. Low Complexity** | ✅ Pass | Vett fix is a targeted ~5 line change; no new branching added; frontend banner is a single conditional render |
| **VI. Clear Module Structure** | ✅ Pass | No new files added to backend; one optional new frontend component (`RoundResultBanner`) with clear single responsibility |

**Post-Design Re-check**: All principles still pass. The plan adds no new layers, abstractions, or cross-cutting concerns beyond what already exists.

## Project Structure

### Documentation (this feature)

```text
specs/003-vett/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── socket-events.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
shared/
└── types.ts                    # RoundEndedPayload + PlayCardResult extended

backend/
└── src/
    └── game/
        ├── domain/
        │   └── game.ts         # BUG FIX: vett pile winner logic
        └── game.gateway.ts     # Add targeted state-sync to pile winner after vett

frontend/
└── src/
    ├── components/
    │   ├── RoundResultBanner.tsx   # NEW: transient vett/clean-round result overlay
    │   └── RoundTable.tsx          # Update: between-rounds waiting state display
    ├── hooks/
    │   └── useRoom.ts              # Update: capture roundResult from round-ended event
    └── pages/
        └── GamePage.tsx            # Update: pass roundResult down to GameTable

test/                               # backend tests
└── unit/domain/
    └── game.spec.ts                # Update: fix vett test assertions + add new cases
```

**Structure Decision**: Web application (Option 2 from template). No structural changes — all modifications are within existing files except one new frontend component (`RoundResultBanner`).

## Complexity Tracking

No constitution violations. No justification required.
