# Socket.IO Event Contracts: Cards in Hand (Slice 1)

**Date**: 2026-09-23
**Transport**: Socket.IO over WebSocket (proxied through Vite in dev)
**Type definitions**: `shared/types.ts`

---

## Convention

- **Client → Server** events: emitted by the browser, handled by the NestJS Gateway.
- **Server → Client** events: emitted by the Gateway, received by the React app.
- All payloads are JSON-serialisable (no `Map`, no `Date` objects — use `number` timestamps).
- Error responses always use the `error` event with an `ErrorPayload`.

---

## Connection Lifecycle

### Auth Handshake (automatic, on every socket connect)

**Client sends** (in Socket.IO `auth` option at initialisation):
```ts
{
  playerId?: string;   // present on reconnect; absent on first connect
  roomCode?: string;   // present on reconnect; absent on first connect
}
```

**Server response on reconnect** (if `playerId` + `roomCode` match an active room):

| Event | Direction | Payload Type | Description |
|---|---|---|---|
| `state-sync` | Server → Client | `StateSyncPayload` | Restores the player's hand and current room snapshot |

**Server response if no match** (first-time connect, or session expired):
No event emitted on connection. Player must emit `create-room` or `join-room`.

---

## Room Management Events

### `create-room`

Player creates a new room. Server generates a unique room code and makes this player the host.

| | |
|---|---|
| **Direction** | Client → Server |
| **Payload** | `{ displayName: string }` |

**Server responds with**:

| Event | Payload Type | Condition |
|---|---|---|
| `join-ack` | `JoinAckPayload` | Room created successfully |
| `error` | `ErrorPayload` | Display name invalid (empty or too long) |

---

### `join-room`

Player joins an existing room by code.

| | |
|---|---|
| **Direction** | Client → Server |
| **Payload** | `JoinRoomPayload` — `{ displayName: string; roomCode: string }` |

**Server responds with**:

| Event | Payload Type | Condition |
|---|---|---|
| `join-ack` | `JoinAckPayload` | Joined successfully |
| `error` | `ErrorPayload` | Room not found, room full (>6), or game already started |

**Server broadcasts to room**:

| Event | Payload Type | Description |
|---|---|---|
| `room-update` | `RoomSnapshot` | Updated room state (new player visible to everyone in the lobby) |

---

### `join-ack`

Sent privately to the joining player only (via `socket.emit`, not `server.to().emit`).

| | |
|---|---|
| **Direction** | Server → Client (private) |
| **Payload** | `JoinAckPayload` — `{ playerId: string; roomCode: string }` |

**Client action**: store `playerId` in `localStorage`. Use in future `auth` handshakes.

---

### `room-update`

Broadcast to all players in the room whenever the lobby state changes (player joins, player disconnects, host changes).

| | |
|---|---|
| **Direction** | Server → Client (broadcast) |
| **Payload** | `RoomSnapshot` — `{ roomCode, status, hostPlayerId, players: PlayerPublic[] }` |

---

## Game Start Events

### `start-game`

Host signals game should begin. Server validates player count, shuffles and deals.

| | |
|---|---|
| **Direction** | Client → Server |
| **Payload** | `{ roomCode: string }` |

**Server responds with**:

| Event | Payload Type | Condition |
|---|---|---|
| `game-started` | `RoomSnapshot` (broadcast) | Dealing complete — sent to all players |
| `hand-dealt` | `{ hand: Card[] }` (private) | Each player's own hand — sent individually via `socket.emit` |
| `error` | `ErrorPayload` | Not the host, or fewer than 2 players |

**Order of operations**:
1. Validate: requester is host, room status is `WAITING`, player count 2–6.
2. Set status to `DEALING`.
3. Shuffle deck, deal cards into per-player hands.
4. Set status to `IN_PROGRESS`.
5. Emit `game-started` (broadcast — room snapshot, no hands).
6. For each player: emit `hand-dealt` privately to that player's socket.

---

### `game-started`

Broadcast to all players when the game transitions to `IN_PROGRESS`.

| | |
|---|---|
| **Direction** | Server → Client (broadcast) |
| **Payload** | `RoomSnapshot` (with `status: 'IN_PROGRESS'`) |

**Client action**: navigate all players from the lobby screen to the game table screen.

---

### `hand-dealt`

Sent privately to each player with their own cards.

| | |
|---|---|
| **Direction** | Server → Client (private, per player) |
| **Payload** | `{ hand: Card[] }` |

**Client action**: populate the local hand state. Do not log or display to other players.

---

## Reconnection Events

### `state-sync`

Sent to a reconnecting player who has a valid `playerId` in the active room.

| | |
|---|---|
| **Direction** | Server → Client (private) |
| **Payload** | `StateSyncPayload` — `{ hand: Card[]; roomSnapshot: RoomSnapshot }` |

**Client action**: restore full game state (hand + room).

---

## Error Events

### `error`

Sent privately to the client that caused the error.

| | |
|---|---|
| **Direction** | Server → Client (private) |
| **Payload** | `ErrorPayload` — `{ code: string; message: string }` |

**Error codes used in Slice 1**:

| Code | Trigger |
|---|---|
| `ROOM_NOT_FOUND` | `join-room` with unknown code |
| `ROOM_FULL` | `join-room` when room already has 6 players |
| `GAME_IN_PROGRESS` | `join-room` when room status is not `WAITING` |
| `NOT_HOST` | `start-game` emitted by a non-host player |
| `NOT_ENOUGH_PLAYERS` | `start-game` with fewer than 2 players |
| `INVALID_DISPLAY_NAME` | Display name empty or exceeds 24 characters |

---

## Complete Event Map Summary

| Event | Direction | Trigger | Audience |
|---|---|---|---|
| `create-room` | C → S | Player creates room | Server |
| `join-room` | C → S | Player joins room by code | Server |
| `join-ack` | S → C | Successful create or join | Joining player only |
| `room-update` | S → C | Any lobby state change | All players in room |
| `start-game` | C → S | Host starts the game | Server |
| `game-started` | S → C | Dealing complete | All players in room |
| `hand-dealt` | S → C | Dealing complete | Each player individually |
| `state-sync` | S → C | Player reconnects | Reconnecting player only |
| `error` | S → C | Any validation failure | Requesting player only |
