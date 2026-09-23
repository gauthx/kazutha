# Research: Cards in Hand (Slice 1)

**Date**: 2026-09-23
**Feature**: specs/001-cards-in-hand

---

## 1. NestJS Socket.IO Gateway Setup

**Decision**: Use `@WebSocketGateway({ cors: { origin: 'http://localhost:5173', credentials: true } })` with no port argument. Socket.IO attaches to the existing NestJS HTTP server on port 3001.

**Rationale**: Passing a port number to `@WebSocketGateway(3001, ...)` attempts to create a second HTTP server on 3001, which collides with the NestJS app server — `EADDRINUSE`. The no-argument form binds to the existing HTTP server automatically.

**Key rule**: `app.enableCors()` only affects the HTTP layer. Socket.IO CORS must be set in the gateway decorator or a custom `IoAdapter`. In development, the Vite proxy removes the CORS concern entirely.

**Alternatives considered**: Custom `IoAdapter` — deferred to a future slice when Redis scaling is needed.

---

## 2. Socket.IO Room Management and Player Identity

**Decision**: Map each game room to a Socket.IO room keyed by the room code. Use a stable `playerId` (UUID, generated server-side on first join) as the player's durable identity — never `socket.id`.

**Rationale**: `socket.id` is ephemeral — it changes on every reconnect including simple tab refreshes. Using `playerId` as the key in the server-side player map allows reconnection to be handled cleanly without evicting the player.

**Reconnection flow**:
- First join: server generates `playerId`, sends it to client via `join-ack`. Client stores in `localStorage`.
- Reconnect: client sends `playerId` in `socket.handshake.auth`. Server finds the player, updates `socketId`, cancels the grace-period eviction timer, and emits `state-sync` with the player's current hand.
- Disconnect grace period: 30 seconds. Player is only evicted if they do not reconnect within the window.

**Disconnect timer key**: Must use `playerId`, not `socketId` — on reconnect the timer must be cancelled but the socket ID has changed.

**Alternatives considered**: Socket.IO `connectionStateRecovery` — useful for brief blips but does not cover the 30-second window needed for tab refreshes. Used in addition to, not instead of, the manual pattern.

---

## 3. `react-playing-cards` Library

**Decision**: Use `@heruka_urgyen/react-playing-cards` (npm package name uses underscores, not hyphens). Install with `--legacy-peer-deps` if React 18 peer dep conflict occurs.

**Card code format**: Two-character string — rank + suit initial. Ranks: `2–9, T, J, Q, K, A`. Suits: `c` (clubs), `d` (diamonds), `h` (hearts), `s` (spades). Example: `Ah` = Ace of Hearts, `Td` = Ten of Diamonds.

**Face-up**: `<Card card="Ah" deckType="basic" height="150px" />`
**Face-down**: `<Card card="Ah" deckType="basic" height="150px" back />`

**Vite compatibility fix** — add to `vite.config.ts`:
```ts
optimizeDeps: { include: ['@heruka_urgyen/react-playing-cards'] }
```

**Mapping**: Internal card representation uses `{ suit: 'HEARTS', rank: 'A' }`. A utility function maps this to the library's card code string: `rank === '10' ? 'T' : rank` + suit initial lowercased.

**Alternatives considered**: Custom SVG component — lower risk for animations in future slices, but out of scope for Slice 1.

---

## 4. Vite Proxy for Socket.IO

**Decision**: Proxy `/socket.io` in `vite.config.ts` to `http://localhost:3001` with `ws: true`.

**Rationale**: Proxying eliminates all CORS concerns in development. The frontend Socket.IO client connects with no URL argument (same-origin), Vite transparently forwards to the backend.

**Critical**: `ws: true` is mandatory. Without it the WebSocket upgrade (HTTP 101) never fires and the connection silently falls back to HTTP long-polling only.

**Alternatives considered**: Direct cross-origin connection with `io('http://localhost:3001')` — works but requires CORS on the backend and is harder to replicate in staging/production environments.

---

## 5. Shared TypeScript Types

**Decision**: `shared/` directory at repo root containing only TypeScript type definitions. Both projects import via `@shared/*` path alias. Vite resolves the alias at build time via `vite-tsconfig-paths`. NestJS resolves at runtime via `tsconfig-paths/register`.

**Structure**:
```
kazutha/
├── shared/
│   └── types.ts        (types only — no imports from node_modules)
├── frontend/
│   └── tsconfig.json   (paths: { "@shared/*": ["../shared/*"] })
└── backend/
    └── tsconfig.json   (paths: { "@shared/*": ["../shared/*"] })
```

**Build-time alias stripping**: TypeScript strips path aliases when compiling to `dist/`. Use `tsc-alias` in the backend build script to rewrite aliases to relative paths post-compile.

**Constraint**: `shared/` must contain only type-level declarations. No imports from `node_modules` — otherwise each project would need to install those deps too, defeating the purpose.

**Alternatives considered**: pnpm workspaces — better long-term, overhead not justified for two projects at this stage.

---

## 6. Card Representation and Deck Utilities

**Decision**: Cards are plain objects with string-literal union types — not enums.

```ts
type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface Card { suit: Suit; rank: Rank; }
```

**Rationale**: String literal unions serialise cleanly over JSON (relevant for Socket.IO payloads), have zero runtime overhead, and provide full type safety. TypeScript enums add runtime objects and complicate JSON round-trips.

**Shuffle**: Fisher-Yates (Durstenfeld variant). Iterates from end, swaps with a uniformly random index from 0 to i inclusive. Bound must be `(i + 1)` — using `i` is a known off-by-one that breaks uniformity.

**Dealing**: Round-robin via `i % numPlayers`. Card `i` goes to player `i % N`. Remainder cards (when 52 % N !== 0) go to the first `(52 % N)` players automatically — no special handling needed.

---

## 7. In-Memory Game Store

**Decision**: Singleton `@Injectable()` NestJS service backed by `Map<roomCode, GameRoom>`. Players within a room stored as `Map<playerId, Player>`.

**Memory leak prevention**: `lastActivityAt` timestamp updated on every room event. A `setInterval` sweep runs every 5 minutes and evicts rooms inactive for more than 2 hours. The interval timer is `.unref()`'d so Jest can exit cleanly. `onModuleDestroy` clears the interval and the map.

**Serialisation gotcha**: `JSON.stringify` does not serialise `Map`. When emitting room state over Socket.IO, convert players to an array: `Array.from(room.players.values())`.

**Shutdown hooks**: `app.enableShutdownHooks()` must be called in `main.ts` for `onModuleDestroy` to fire.

---

## 8. Room Code Generation

**Decision**: 6-character code from the alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 symbols, ambiguous characters removed). Generated with `crypto.randomInt` (bias-free). Checked against active rooms; retry up to 10 times.

**Keyspace**: 32⁶ ≈ 1.07 billion — negligible collision risk at any realistic game load.

**User input normalisation**: Always `.toUpperCase().trim()` before lookup. Users frequently type lowercase.

**Alternatives considered**: `nanoid` with custom alphabet — equivalent approach, adds a dependency. Hand-rolled `crypto.randomInt` loop is sufficient and has no dependencies.

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---|---|
| Gateway port configuration | No port arg in `@WebSocketGateway` — shares HTTP server |
| CORS in dev | Vite proxy `/socket.io → localhost:3001, ws: true` |
| Player identity across reconnects | Stable `playerId` UUID in localStorage, sent via `auth` handshake |
| Card library card code format | `Rank + suit-initial-lowercase` e.g. `Ah`, `Td`, `2s` |
| Shared types path resolution | `vite-tsconfig-paths` (frontend) + `tsconfig-paths/register` (backend) |
| Shuffle algorithm | Fisher-Yates Durstenfeld, bound `(i + 1)` |
| Dealing algorithm | Round-robin `i % numPlayers` |
| In-memory store structure | Singleton service, `Map<roomCode, GameRoom>`, `Map<playerId, Player>` |
| Memory leak prevention | TTL sweep + `lastActivityAt` |
| Room code format | 6-char, `crypto.randomInt`, unambiguous alphabet |
