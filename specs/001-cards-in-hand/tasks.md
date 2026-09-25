# Tasks: Cards in Hand

**Input**: Design documents from `specs/001-cards-in-hand/`

**References**: [spec.md](./spec.md) | [plan.md](./plan.md) | [data-model.md](./data-model.md) | [contracts/socket-events.md](./contracts/socket-events.md) | [research.md](./research.md) | [quickstart.md](./quickstart.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold both projects and shared types so every subsequent task has a working base.

- [X] T001 Initialize NestJS backend project in `backend/` with `nest new backend --package-manager npm`, remove default app controller and service boilerplate
- [X] T002 Initialize React + TypeScript + Vite frontend project in `frontend/` with `npm create vite@latest frontend -- --template react-ts`
- [X] T003 [P] Create `shared/types.ts` at repo root with all type declarations from data-model.md (`Suit`, `Rank`, `Card`, `GameStatus`, `PlayerPublic`, `PlayerPrivate`, `RoomSnapshot`, `JoinRoomPayload`, `JoinAckPayload`, `StateSyncPayload`, `ErrorPayload`)
- [X] T004 [P] Configure Tailwind CSS in `frontend/` — install `tailwindcss`, `postcss`, `autoprefixer`; create `frontend/tailwind.config.js` and `frontend/postcss.config.js`; add Tailwind directives to `frontend/src/index.css`
- [X] T005 [P] Install `@heruka_urgyen/react-playing-cards --legacy-peer-deps` in `frontend/`; add `optimizeDeps.include` entry to `frontend/vite.config.ts`
- [X] T006 Configure `@shared/*` path alias in `frontend/tsconfig.json` (`baseUrl: "."`, `paths: { "@shared/*": ["../shared/*"] }`); install `vite-tsconfig-paths` and add to `frontend/vite.config.ts` plugins
- [X] T007 Configure `@shared/*` path alias in `backend/tsconfig.json` (`baseUrl: "."`, `paths: { "@shared/*": ["../shared/*"] }`); install `tsconfig-paths` and `tsc-alias` in `backend/`; update `backend/package.json` build and start:dev scripts to use them
- [X] T008 [P] Configure Vite dev proxy in `frontend/vite.config.ts` — add `server.proxy` for `/socket.io` pointing to `http://localhost:3001` with `ws: true` and `changeOrigin: true`
- [X] T009 [P] Install Socket.IO server packages in `backend/` — `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- [X] T010 [P] Install Socket.IO client in `frontend/` — `socket.io-client`
- [X] T011 Create `frontend/src/socket.ts` — export a singleton Socket.IO client instance with no URL argument (uses Vite proxy); read `playerId` from `localStorage` and pass in `auth` option
- [X] T012 [P] Create root `README.md` with setup instructions: prerequisites, how to start backend (`cd backend && npm install && npm run start:dev`), how to start frontend (`cd frontend && npm install && npm run dev`), and the `@shared/*` convention

**Checkpoint**: Both `npm run start:dev` (backend) and `npm run dev` (frontend) start without errors. Frontend loads a blank page at `localhost:5173`. Backend logs "Application is running on port 3001".

- [X] T013-C Commit Phase 1 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core game infrastructure that every user story depends on. Must be complete before any story work begins.

- [X] T013 Create `backend/src/utils/room-code.ts` — implement `generateRoomCode()` and `generateUniqueRoomCode()` using simple 4-digit incrementing code starting from 1000
- [X] T014 Create `backend/src/game/deck.service.ts` as `@Injectable()` — implement `createDeck(): Card[]` (4 suits × 13 ranks, 52 cards), `shuffleDeck<T>(array: T[]): T[]` (Fisher-Yates Durstenfeld, bound `i + 1`), `dealCards(deck: Card[], numPlayers: number): Card[][]` (round-robin `i % numPlayers`)
- [X] T015 Create `backend/src/game/game-store.service.ts` as `@Injectable()` with `Map<string, GameRoom>` — implement `createRoom(roomCode)`, `getRoom(roomCode)`, `findPlayerBySocketId(socketId)`, `updateActivity(roomCode)`, `deleteRoom(roomCode)`; add TTL sweep with `setInterval` (2h TTL, 5m interval, `.unref()`); implement `onModuleDestroy` to clear interval and map; call `app.enableShutdownHooks()` in `backend/src/main.ts`
- [X] T016 Create `backend/src/game/game.module.ts` — declare and export `DeckService` and `GameStoreService`; import `GameModule` in `backend/src/app.module.ts`
- [X] T017 [P] Create `backend/src/main.ts` — bootstrap with `NestFactory.create`, listen on port 3001, call `app.enableShutdownHooks()`, `app.enableCors({ origin: 'http://localhost:5173', credentials: true })` (HTTP layer only)
- [X] T018 [P] Create `frontend/src/utils/cardCode.ts` — implement `toCardCode(card: Card): string` that maps `{ suit, rank }` to the library's two-character format (rank `'10'` → `'T'`, suit to lowercase initial: `SPADES → s`, etc.)
- [X] T019 [P] Create `frontend/src/hooks/useRoom.ts` — React hook managing `RoomSnapshot | null` state; subscribes to `room-update` and `game-started` socket events; exposes `roomSnapshot`, `isHost` (compares `playerId` from localStorage to `hostPlayerId`)
- [X] T020 [P] Create `frontend/src/hooks/useHand.ts` — React hook managing `Card[]` state; subscribes to `hand-dealt` and `state-sync` socket events; exposes `hand`

**Checkpoint**: Backend starts cleanly. `DeckService` can be instantiated and `dealCards(shuffleDeck(createDeck()), 4)` returns 4 hands of 13 non-duplicate cards. `GameStoreService` can create, retrieve, and delete a room.

- [X] T021-C Commit Phase 2 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Phase 3: User Story 1 — Host Creates a Room and Shares the Code (Priority: P1)

**Goal**: A player opens the browser, enters a display name, creates a room, gets a code, and sees the lobby.

**Independent Test**: Single user opens `localhost:5173`, enters a name, clicks "Create Room", sees a room code and their name in the lobby list. A second user enters the code and appears in both lobbies in real time.

### Implementation

- [ ] T021 [US1] Create `backend/src/game/game.gateway.ts` as `@WebSocketGateway({ cors: { origin: 'http://localhost:5173', credentials: true } })` implementing `OnGatewayConnection` and `OnGatewayDisconnect`; inject `GameStoreService` and `DeckService`; add `@WebSocketServer() server: Server`; add auth middleware in `afterInit` that reads `playerId` from `socket.handshake.auth` or assigns a new UUID and emits it back; add `disconnectTimers: Map<string, NodeJS.Timeout>` keyed by stable `playerId`
- [ ] T022 [US1] Add `handleConnection` to `backend/src/game/game.gateway.ts` — on reconnect path: if `playerId` + `roomCode` present in auth, find player in store, cancel grace timer, update `socketId` and `isConnected`, call `socket.join(roomCode)`, emit `state-sync` with hand and room snapshot; otherwise do nothing (new join handled by event)
- [ ] T023 [US1] Add `handleDisconnect` to `backend/src/game/game.gateway.ts` — find player by `socketId` via `findPlayerBySocketId`, set `isConnected: false`, broadcast `room-update` to room, start 30s grace-period `setTimeout` keyed by `playerId`; if timer fires, remove player from room and emit `player-left`; if room is empty, delete it; transfer `hostPlayerId` to next connected player if host disconnects
- [ ] T024 [US1] Add `@SubscribeMessage('create-room')` handler to `backend/src/game/game.gateway.ts` — validate display name (1–24 chars after trim); generate unique room code via `generateUniqueRoomCode`; create room in store; set `hostPlayerId`; add player with new UUID `playerId`; call `socket.join(roomCode)`; emit `join-ack` privately; emit `room-update` broadcast (convert `players` Map to array using `Array.from(room.players.values())` mapped to `PlayerPublic`)
- [ ] T025 [US1] Add `@SubscribeMessage('join-room')` handler to `backend/src/game/game.gateway.ts` — validate display name; look up room; reject with `error` if not found, full (>6), or status not `WAITING`; add player; call `socket.join(roomCode)`; emit `join-ack` privately; broadcast `room-update` to room
- [ ] T026 [US1] Declare `GameGateway` in `backend/src/game/game.module.ts` providers list
- [ ] T027 [P] [US1] Create `frontend/src/pages/HomePage.tsx` — form with display name input and two buttons: "Create Room" (emits `create-room`) and "Join Room" with room code input (emits `join-room`); on `join-ack` store `playerId` in `localStorage` and navigate to `/room/:roomCode`; on `error` display the error message inline
- [ ] T028 [P] [US1] Create `frontend/src/components/Lobby.tsx` — receives `roomSnapshot` and `isHost` props; renders player list (`PlayerPublic[]` with names and connection status dots); renders "Start Game" button visible only to host and disabled when `players.length < 2`; renders room code prominently with a copy-to-clipboard button
- [ ] T029 [US1] Create `frontend/src/pages/GamePage.tsx` — on mount determine `roomCode` from URL params and `playerId` from `localStorage`; render `<Lobby>` when `roomSnapshot.status === 'WAITING'`; render `<GameTable>` when status is `IN_PROGRESS`; handle `error` events and show dismissible error banners
- [ ] T030 [US1] Wire routing in `frontend/src/App.tsx` — use `react-router-dom`: `/` renders `<HomePage>`, `/room/:roomCode` renders `<GamePage>`; install `react-router-dom` in `frontend/`

**Checkpoint**: Two browser windows can create/join the same room. Both lobbies update in real time when the second player joins. Lobby shows host badge and "Start Game" button state correctly.

- [ ] T031-C Commit Phase 3 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Phase 4: User Story 2 — Host Starts the Game and Cards Are Dealt (Priority: P1)

**Goal**: Host clicks "Start Game"; all players navigate to the game table with their hands dealt.

**Independent Test**: Two players in a room. Host clicks Start Game. Both browsers navigate to the table. Each player's hand totals 26 cards. No card appears in both hands.

### Implementation

- [ ] T031 [US2] Add `@SubscribeMessage('start-game')` handler to `backend/src/game/game.gateway.ts` — validate requester is `hostPlayerId`; validate `players.size >= 2`; set status to `DEALING`; shuffle deck via `DeckService.shuffleDeck(DeckService.createDeck())`; deal via `DeckService.dealCards`; assign each hand to corresponding player in the store; set status to `IN_PROGRESS`; broadcast `game-started` with `RoomSnapshot` (no hands); for each player emit `hand-dealt` privately to that player's current `socketId`
- [ ] T032 [US2] Add "Start Game" click handler to `frontend/src/components/Lobby.tsx` — emit `start-game` event with `{ roomCode }` on button click
- [ ] T033 [P] [US2] Create `frontend/src/components/PlayerHand.tsx` — receives `hand: Card[]`; renders each card face-up using `<Card card={toCardCode(c)} deckType="basic" height="120px" />` from `@heruka_urgyen/react-playing-cards`; lays out cards in a horizontal scrollable fan row using Tailwind flex utilities
- [ ] T034 [P] [US2] Create `frontend/src/components/OpponentHand.tsx` — receives `player: PlayerPublic`; renders `player.cardCount` face-down card backs using `<Card card="Ah" deckType="basic" height="80px" back />`; renders player display name and connection status indicator above the hand
- [ ] T035 [US2] Create `frontend/src/components/GameTable.tsx` — receives `roomSnapshot: RoomSnapshot`, `localHand: Card[]`, `localPlayerId: string`; positions opponents around the table using Tailwind absolute/relative layout (top: opponent, left/right: opponents, bottom: local player); renders `<PlayerHand>` for local player at bottom; renders `<OpponentHand>` for each other player
- [ ] T036 [US2] Update `frontend/src/pages/GamePage.tsx` — pass `hand` from `useHand()` and `roomSnapshot` from `useRoom()` as props to `<GameTable>`; pass `localPlayerId` from localStorage

**Checkpoint**: Host starts game. Both players see the game table. Local player sees their cards face-up. Opponent's hand shows face-down backs with correct card count. No card appears in both players' hands (verify via console inspection).

- [ ] T037-C Commit Phase 4 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Phase 5: User Story 3 — Each Player Sees Only Their Own Hand (Priority: P1)

**Goal**: Verify hand privacy — each player sees different face-up cards; opponent hands are hidden.

**Independent Test**: Open browser devtools on both windows. Confirm `hand-dealt` payload received on browser A does not contain any card from browser B's `hand-dealt` payload.

### Implementation

- [ ] T037 [US3] Audit `backend/src/game/game.gateway.ts` `start-game` handler — confirm `hand-dealt` is emitted via `this.server.to(player.socketId).emit('hand-dealt', { hand: player.hand })` (individual socket emit), NOT via `this.server.to(roomCode).emit()` (room broadcast); add a comment documenting this privacy contract
- [ ] T038 [US3] Audit `game-started` broadcast in `backend/src/game/game.gateway.ts` — confirm the `RoomSnapshot` emitted contains only `PlayerPublic[]` (with `cardCount`, no `hand` field); add a unit-level comment referencing the `PlayerPublic` vs `PlayerPrivate` distinction in `shared/types.ts`
- [ ] T039 [US3] Verify `frontend/src/components/GameTable.tsx` never receives or renders another player's full hand — confirm props only accept `PlayerPublic` for opponents (which has `cardCount` but not `hand`); confirm `<OpponentHand>` only uses `cardCount` to render backs
- [ ] T040 [US3] Add card count display to `frontend/src/components/OpponentHand.tsx` — show `{player.cardCount} cards` label beneath the face-down card backs so remaining card counts are visible to all players at a glance

**Checkpoint**: Confirmed via devtools Network > WS tab that the `hand-dealt` message for player A and player B carry different card arrays. Confirmed no hand data appears in the `game-started` broadcast.

- [ ] T041-C Commit Phase 5 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Phase 6: User Story 4 — Player Rejoins After Accidental Disconnect (Priority: P2)

**Goal**: Refresh a browser tab mid-game; hand is restored within 10 seconds.

**Independent Test**: Two players in an active game. Refresh browser B. Browser B reconnects and shows the same hand it had before the refresh. Browser A shows no change in opponent card count.

### Implementation

- [ ] T041 [US4] Verify `handleConnection` in `backend/src/game/game.gateway.ts` correctly handles the reconnect path — reads `playerId` and `roomCode` from `socket.handshake.auth`; finds player in store; cancels grace-period timer; updates `socketId`; calls `socket.join(roomCode)`; emits `state-sync` with full `hand` and `RoomSnapshot`
- [ ] T042 [US4] Update `frontend/src/socket.ts` — on socket initialization also read `roomCode` from `localStorage` (stored at join time) and include in `auth` so the server can restore session on refresh; store `roomCode` in `localStorage` in the `join-ack` handler in `frontend/src/pages/HomePage.tsx`
- [ ] T043 [US4] Handle `state-sync` event in `frontend/src/hooks/useHand.ts` — update hand state from `payload.hand`; handle `state-sync` event in `frontend/src/hooks/useRoom.ts` — update room snapshot from `payload.roomSnapshot`
- [ ] T044 [US4] Add reconnecting UI state to `frontend/src/pages/GamePage.tsx` — show a "Reconnecting…" overlay when socket `disconnect` event fires; hide overlay when `connect` event fires or `state-sync` is received; use a `connected` boolean state driven by socket `connect`/`disconnect` events

**Checkpoint**: Refresh browser tab. "Reconnecting…" overlay appears briefly. Within 5 seconds: game table is restored with the same hand. Backend logs show `state-sync` emitted to the new socket ID.

- [ ] T045-C Commit Phase 6 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Error UX, edge cases, layout polish, and quickstart validation.

- [ ] T045 [P] Add error banner component to `frontend/src/components/ErrorBanner.tsx` — dismissible, styled with Tailwind; used in `<HomePage>` for join errors and `<GamePage>` for runtime errors (room full, game in progress, etc.)
- [ ] T046 [P] Handle host-disconnect lobby case in `frontend/src/components/Lobby.tsx` — listen for `room-update` events; if `hostPlayerId` changes, show "Host has changed" notification briefly
- [ ] T047 [P] Add display name validation to `frontend/src/pages/HomePage.tsx` — client-side guard: reject empty string and strings longer than 24 characters with inline form error before emitting to server
- [ ] T048 [P] Handle "Game already in progress" join attempt — `frontend/src/pages/HomePage.tsx` displays `GAME_IN_PROGRESS` error code as a user-friendly message "This game has already started"
- [ ] T049 Add `backend/src/game/deck.service.spec.ts` — tests: `createDeck()` returns exactly 52 cards with no duplicates; `shuffleDeck()` returns all 52 cards (different order not guaranteed but count verified); `dealCards(deck, 4)` returns 4 hands totalling 52 non-duplicate cards; `dealCards(deck, 3)` returns hand sizes [18, 17, 17]
- [ ] T050 Add `backend/src/utils/room-code.spec.ts` — tests: generated code is 4 digits; starts at 1000 and increments; generateUniqueRoomCode checks for collision
- [ ] T051 Add `frontend/src/utils/cardCode.spec.ts` (Vitest) — tests: `toCardCode({ suit: 'HEARTS', rank: 'A' })` returns `'Ah'`; `toCardCode({ suit: 'SPADES', rank: '10' })` returns `'Ts'`; all 52 card combinations produce a non-empty two-char string
- [ ] T052 Run all quickstart.md validation scenarios manually — confirm Scenarios 1–6 pass; document any deviations as follow-up issues
- [ ] T052-C Commit Phase 7 — stage all changes with `git add -A` and run the commit-msg-generator skill to generate and apply a commit message

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 3 (needs lobby + room before game start)
- **US3 (Phase 5)**: Depends on Phase 4 (needs dealing before privacy audit)
- **US4 (Phase 6)**: Depends on Phase 4 (needs dealing before reconnect restores hand)
- **Polish (Phase 7)**: Depends on Phases 3–6

### Within Each Phase

- Tasks marked `[P]` within a phase can run in parallel (they touch different files)
- Tasks without `[P]` within a phase depend on the immediately preceding non-parallel task or the phase checkpoint

### Key Sequential Chains

```
T001 → T002 → (T003–T012 parallel) → Phase 1 Checkpoint
     ↓
T013 → T014 → T015 → T016 → T017 [parallel with T018–T020] → Phase 2 Checkpoint
     ↓
T021 → T022 → T023 → T024 → T025 → T026 → (T027–T028 parallel) → T029 → T030 → Phase 3 Checkpoint
     ↓
T031 → T032 → (T033–T034 parallel) → T035 → T036 → Phase 4 Checkpoint
     ↓
T037 → T038 → T039 → T040 → Phase 5 Checkpoint
     ↓
T041 → T042 → T043 → T044 → Phase 6 Checkpoint
     ↓
(T045–T051 parallel) → T052
```

---

## Parallel Example: Phase 1 Setup

```
# Run all of these simultaneously (different files, no inter-dependencies):
T003 — shared/types.ts
T004 — frontend Tailwind setup
T005 — react-playing-cards install
T008 — vite.config.ts proxy
T009 — backend Socket.IO packages
T010 — frontend socket.io-client
T012 — README.md
```

## Parallel Example: Phase 7 Polish

```
# Run simultaneously:
T045 — ErrorBanner component
T046 — Lobby host-change handling
T047 — Client-side name validation
T048 — Game-in-progress error message
T049 — DeckService tests
T050 — RoomCode tests
T051 — cardCode tests
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (create/join room, lobby)
4. Complete Phase 4: US2 (start game, deal cards, game table)
5. **Stop and validate**: two players can see their dealt hands
6. This is the minimum playable state for Slice 1

### Full Slice 1

Continue with Phase 5 (privacy audit), Phase 6 (reconnection), Phase 7 (polish + tests).

### Incremental Delivery

Each phase checkpoint is a demo-able state:
- After Phase 3: Show lobby with real-time player joining
- After Phase 4: Show dealt hands on the game table
- After Phase 6: Show reconnection surviving a tab refresh

---

## Notes

- `[P]` tasks touch different files and have no runtime dependency on each other within the same phase
- `[US1]`–`[US4]` labels map to user stories in `spec.md` for traceability
- No hand data should ever appear in a room broadcast — enforced by using `PlayerPublic` (no `hand` field) in `RoomSnapshot`
- The `disconnectTimers` Map in the gateway is keyed by stable `playerId`, never `socketId` — this is a correctness requirement, not a style preference
- Commit after each phase checkpoint at minimum
