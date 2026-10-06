# Implementation Plan: Player Elimination

**Branch**: `004-player-elimination` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-player-elimination/spec.md`

## Summary

Implement player elimination mechanics and Kazhutha (loser) declaration. When a player plays their last card and the round resolves without them receiving a pile, they transition to spectator status. Turn order rotation dynamically skips spectators. When only one active player with cards remains, the game terminates, declares the remaining player as Kazhutha, records final rankings in the room snapshot, and notifies all connected clients.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: NestJS 10, Socket.IO, React 18, Vite, Tailwind CSS  
**Storage**: In-memory (server RAM, `GameStoreService`)  
**Testing**: Vitest (backend domain & gateway tests; frontend component tests)  
**Target Platform**: Node.js server (backend) & Modern Browsers (frontend)  
**Project Type**: Fullstack multiplayer web game (REST lobby + WebSocket gameplay)  
**Performance Goals**: <50ms real-time state broadcast latency; instantaneous turn transition  
**Constraints**: In-memory room state lifecycle; 2–6 players per room; zero database dependencies  
**Scale/Scope**: Multiplayer turn order, spectator exclusion, trick winner priority succession (second-highest/remaining highest card holder), Kazhutha game over transition  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- [x] **I. Separation of Concerns**: Game domain logic (`Game`, `Round`, `Player`) remains isolated from Socket.IO networking (`GameGateway`) and React UI (`GameTable`, `PlayerHand`, `OpponentHand`).
- [x] **II. Justified Modularity**: Domain rules for elimination, turn succession, and Kazhutha resolution reside directly in `Game` without unnecessary intermediary abstractions.
- [x] **III. Encapsulated State**: Mutation of `finishOrder`, `status`, and `finishPosition` is encapsulated inside `Game` and `Player` methods. No global mutable variables.
- [x] **IV. Consistency**: Naming conventions and shared interfaces (`RoomSnapshot`, `PlayerPublic`) follow established camelCase patterns across both frontend and backend.
- [x] **V. Low Complexity**: Elimination logic executes sequentially at round resolution boundaries (clean trick resolution and vett resolution) without deep branching or recursion.
- [x] **VI. Clear Module Structure**: All domain logic lives in `backend/src/game/domain/`, DTOs in `shared/`, and UI components in `frontend/src/components/`.

## Project Structure

### Documentation (this feature)

```text
specs/004-player-elimination/
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── plan.md              # This implementation plan
├── research.md          # Architectural decisions & research
├── data-model.md        # Domain entities, DTOs & state transitions
├── quickstart.md        # Runnable verification scenarios
└── contracts/
    └── socket-events.md # Real-time Socket.IO interface contract
```

### Source Code Layout

```text
shared/
└── types.ts             # PlayerPublic & RoomSnapshot extensions

backend/
├── src/
│   └── game/
│       ├── domain/
│       │   ├── player.ts    # Finish position & spectator helper
│       │   ├── round.ts     # Active turn-order handling
│       │   └── game.ts      # Post-round elimination & Kazhutha resolution
│       ├── game.service.ts
│       └── game.gateway.ts  # Broadcast of game-ended / room-update states
└── test/
    └── unit/
        ├── domain/
        │   ├── player.spec.ts
        │   └── game.spec.ts # Elimination & game over test cases
        └── game.gateway.spec.ts

frontend/
├── src/
│   ├── components/
│   │   ├── OpponentHand.tsx # Spectator badge indicator
│   │   ├── PlayerHand.tsx   # Spectator disabled controls
│   │   └── GameTable.tsx    # Spectator / Kazhutha indicators
│   └── hooks/
│       └── useRoom.ts       # RoomSnapshot handling
└── test/
```

## Complexity Tracking

*No constitutional violations identified. No tracking required.*
