# HTTP REST API Contracts: Room Setup & Lobby

**Date**: 2026-09-30
**Transport**: HTTP/JSON (proxied through `/api` in Vite)
**Type definitions**: `shared/types.ts`

---

## Convention

- All requests and responses use JSON content type (`application/json`).
- Errors return standard HTTP status codes along with `{ "code": string, "message": string }` (`ErrorPayload`).
- Room setup (creation, joining, polling, leaving, and game start) is managed via HTTP endpoints. WebSocket is connected only after the game transitions to `IN_PROGRESS`.

---

## Endpoints

### 1. Create Room

Creates a new game room. The creator is designated as the host.

- **Method**: `POST`
- **Path**: `/api/rooms`
- **Request Body**:
  ```json
  {
    "displayName": "Alice"
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "roomCode": 1000,
    "playerId": "player-uuid",
    "snapshot": {
      "roomCode": 1000,
      "status": "WAITING",
      "hostPlayerId": "player-uuid",
      "players": [
        {
          "playerId": "player-uuid",
          "displayName": "Alice",
          "cardCount": 0,
          "isConnected": true
        }
      ]
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"code": "INVALID_DISPLAY_NAME", "message": "Display name must be between 1 and 24 characters"}`

---

### 2. Join Room

Joins an existing room by its 4-digit code.

- **Method**: `POST`
- **Path**: `/api/rooms/:code/join`
- **Request Body**:
  ```json
  {
    "displayName": "Bob"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "roomCode": 1000,
    "playerId": "player-uuid-2",
    "snapshot": { ... }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"code": "INVALID_DISPLAY_NAME", ...}`
  - `404 Not Found`: `{"code": "ROOM_NOT_FOUND", "message": "Room not found"}`
  - `409 Conflict`: `{"code": "ROOM_FULL", "message": "Room is full (max 6 players)"}`
  - `409 Conflict`: `{"code": "GAME_IN_PROGRESS", "message": "Game is already in progress"}`

---

### 3. Get Room Snapshot (Polling)

Fetches the current state of the room. Polled every 2 seconds by clients waiting in the lobby.

- **Method**: `GET`
- **Path**: `/api/rooms/:code`
- **Success Response** (`200 OK`):
  `RoomSnapshot` JSON object.
- **Error Responses**:
  - `404 Not Found`: `{"code": "ROOM_NOT_FOUND", "message": "Room not found"}`

---

### 4. Start Game

Host initiates game dealing and transition to active play.

- **Method**: `POST`
- **Path**: `/api/rooms/:code/start`
- **Request Body**:
  ```json
  {
    "playerId": "host-player-uuid"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "snapshot": { ... }
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: `{"code": "NOT_HOST", "message": "Only the host can start the game"}`
  - `400 Bad Request`: `{"code": "NOT_ENOUGH_PLAYERS", "message": "At least 2 players are required to start"}`
  - `409 Conflict`: `{"code": "GAME_IN_PROGRESS", "message": "Game is already in progress"}`

---

### 5. Leave Room

Player explicitly leaves the lobby.

- **Method**: `POST`
- **Path**: `/api/rooms/:code/leave`
- **Request Body**:
  ```json
  {
    "playerId": "player-uuid"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true
  }
  ```
