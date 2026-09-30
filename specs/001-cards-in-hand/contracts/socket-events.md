# Socket.IO Event Contracts: Gameplay & Reconnection (Slice 1)

**Date**: 2026-09-30
**Transport**: Socket.IO over WebSocket (proxied through Vite in dev)
**Type definitions**: `shared/types.ts`

> [!NOTE]
> **Room Setup & Lobby**: Room creation, joining, polling, leaving, and game start are managed over HTTP REST endpoints. See [`http-api.md`](./http-api.md).
> WebSockets are connected only when entering active gameplay (`status === 'IN_PROGRESS'`) or reconnecting to an in-progress game.

---

## Convention

- **Client → Server** events: emitted by the browser, handled by the NestJS Gateway.
- **Server → Client** events: emitted by the Gateway, received by the React app.
- All payloads are JSON-serialisable.
- Error responses always use the `error` event with an `ErrorPayload`.

---

## Connection Lifecycle

### Auth Handshake (on socket connect when entering active gameplay or reconnecting)

**Client sends** (in Socket.IO `auth` option at connection):
```ts
{
  playerId: string;   // player ID from localStorage
  roomCode: number;   // room code from localStorage / URL
}
```

**Server response on connection** (when `playerId` + `roomCode` match an active room):

| Event | Direction | Payload Type | Description |
|---|---|---|---|
| `state-sync` | Server → Client (private) | `StateSyncPayload` | Restores the player's dealt hand and current room snapshot |
| `room-update` | Server → Client (broadcast) | `RoomSnapshot` | Notifies other players in the room of the player's connected status |

---

## Gameplay Events

### `hand-dealt`

Sent privately to each player with their dealt cards when cards are distributed.

| | |
|---|---|
| **Direction** | Server → Client (private, per player) |
| **Payload** | `{ hand: Card[] }` |

**Client action**: populate the local hand state. Do not log or display to other players.

---

### `room-update`

Broadcast to all players in the room whenever player connection state or player counts change during gameplay.

| | |
|---|---|
| **Direction** | Server → Client (broadcast) |
| **Payload** | `RoomSnapshot` — `{ roomCode, status, hostPlayerId, players: PlayerPublic[] }` |

---

## Reconnection Events

### `state-sync`

Sent to a connecting or reconnecting player who has a valid `playerId` in the room.

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

---

## Gameplay Event Map Summary

| Event | Direction | Trigger | Audience |
|---|---|---|---|
| `state-sync` | S → C | Socket connects to in-progress room | Connecting player only |
| `hand-dealt` | S → C | Cards dealt | Each player individually |
| `room-update` | S → C | Player connects/disconnects in game | All players in room |
| `error` | S → C | Any validation failure | Requesting player only |
