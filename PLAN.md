# Kazhutha — Tech Stack & Project Plan

## Game Configuration

| Decision        | Choice                                   |
|-----------------|------------------------------------------|
| Player mode     | Multiplayer only (real players, no bots) |
| Players per room| 2–6 (configurable per game room)         |
| Authentication  | None — display name + room code          |

---

## Repository Structure

Single repo, two root-level directories (no workspace manager):

```
kazutha/
├── frontend/        # React + TypeScript + Vite
├── backend/         # NestJS + TypeScript
├── game_rules.md    # Source of truth for game logic
├── PLAN.md          # This file
└── .specify/        # Speckit memory & templates
```

Types shared between frontend and backend are kept in a `shared/` directory at the root, imported via TypeScript path aliases in each project.

---

## Frontend Stack

| Layer          | Choice                                                              |
|----------------|---------------------------------------------------------------------|
| Framework      | React 18 + TypeScript                                               |
| Build tool     | Vite                                                                |
| Styling        | Tailwind CSS                                                        |
| Card rendering | [react-playing-cards](https://github.com/heruka-urgyen/react-playing-cards) |
| Real-time      | Socket.IO client                                                    |
| Testing        | Vitest                                                              |

---

## Backend Stack

| Layer          | Choice                                    |
|----------------|-------------------------------------------|
| Runtime        | Node.js                                   |
| Framework      | NestJS + TypeScript                       |
| Real-time      | Socket.IO (NestJS Gateways)               |
| Game state     | In-memory (server RAM, no database)       |
| Auth           | None (MVP)                                |
| Testing        | Jest (NestJS default)                     |

---

## Real-Time Communication Pattern

```
Browser (Socket.IO client)
        <-> WebSocket
NestJS Gateway (Socket.IO server)
        <->
In-Memory Game Store (rooms, hands, round state)
```

Key Socket.IO concepts used:
- Rooms — each game room maps to a Socket.IO room
- Broadcasts — push game state updates to all players in a room
- Events — typed event contracts for game actions (play-card, game-state-update, vett, round-end)

---

## Feature Slices — Gameplay-First

Each slice is a playable increment. Run `specify -> plan -> tasks -> implement` per slice.

| # | Slice                        | What is Playable After This Slice                                                               |
|---|------------------------------|-------------------------------------------------------------------------------------------------|
| 1 | Cards in Hand                | Players connect via room code, cards are dealt, each player sees their own hand in the browser  |
| 2 | A-spade Auto-play + Suit Following | Game starts automatically (A spade played), led suit is enforced, clean rounds resolve (no vett) |
| 3 | Vett                         | A player without the led suit breaks the round; highest led-suit card player takes the pile and leads next |
| 4 | Player Elimination           | Empty hand -> player becomes spectator; last player holding cards is declared Kazhutha          |
| 5 | End Screen & Replay          | Results screen with finish order, Kazhutha revealed, play-again flow                            |

> Slice 1 bundles scaffold + multiplayer connection + card dealing into one deliverable so the very first runnable state is already a real game setup.

---

## Testing Strategy

| Layer    | Tool    | Focus                                        |
|----------|---------|----------------------------------------------|
| Frontend | Vitest  | Component rendering, UI interactions         |
| Backend  | Jest    | Game engine unit tests, Gateway integration  |

---

