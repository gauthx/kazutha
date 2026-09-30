# Feature Specification: Cards in Hand

**Created**: 2026-09-22

**Status**: Draft

**Input**: Slice 1 of the Kazhutha game — bundle project scaffold, multiplayer room connection, card dealing, and each player seeing their own hand in the browser into a single playable deliverable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Creates a Room and Shares the Code (Priority: P1)

A player opens the game in their browser, enters a display name, and creates a new game room. They receive a short room code that they can share with other players. They wait in a lobby screen showing who has joined.

**Why this priority**: Room creation is the entry point for every game session. Nothing else can happen until at least one player has a room to join.

**Independent Test**: Can be fully tested by a single user opening the browser, entering a name, clicking "Create Room", and verifying a room code appears on screen and the lobby shows their name.

**Acceptance Scenarios**:

1. **Given** the game is open in a browser, **When** a player enters their display name and clicks "Create Room", **Then** a unique 4-digit room code (starting from 1000) is generated and displayed, and the player sees a lobby screen listing themselves as a participant.
2. **Given** a room has been created, **When** a second player opens the game in a different browser tab, enters their name, enters the room code, and clicks "Join Room", **Then** both players see each other in the lobby.
3. **Given** a player enters an invalid or non-existent room code, **When** they click "Join Room", **Then** an error message is displayed and they remain on the join screen.

---

### User Story 2 - Host Starts the Game and Cards Are Dealt (Priority: P1)

Once enough players are in the lobby (minimum 2), the host can start the game. The 52-card deck is shuffled and dealt as evenly as possible among all players. Each player is immediately taken to the game table screen.

**Why this priority**: Dealing cards is the core deliverable of this slice. Without it, nothing playable exists.

**Independent Test**: Can be fully tested by two players joining a room, the host clicking "Start Game", and verifying each player's screen shows a hand of cards totalling the correct share of 52 cards.

**Acceptance Scenarios**:

1. **Given** 2 or more players are in the lobby, **When** the host clicks "Start Game", **Then** all players are simultaneously navigated to the game table and each player's hand is populated with their dealt cards.
2. **Given** 52 cards are dealt among N players, **When** the game starts, **Then** every card appears in exactly one player's hand, no card is duplicated, and hand sizes differ by at most 1 card when 52 does not divide evenly by N.
3. **Given** fewer than 2 players are in the lobby, **When** the host attempts to start the game, **Then** the "Start Game" button is disabled or an informative message prevents the action.

---

### User Story 3 - Each Player Sees Only Their Own Hand (Priority: P1)

On the game table screen, a player sees their own cards face-up and can identify each card by suit and rank. Other players' hands are visible only as face-down card backs showing the count of cards remaining.

**Why this priority**: The privacy of each player's hand is a core rule of the game. Showing the wrong cards would break the game entirely.

**Independent Test**: Can be fully tested by two players in separate browser tabs verifying that they see different face-up cards and that each sees the other's hand as face-down cards with the correct count.

**Acceptance Scenarios**:

1. **Given** the game has started, **When** a player views the game table, **Then** their own cards are displayed face-up using the card library (suit and rank clearly visible).
2. **Given** the game has started, **When** a player views the game table, **Then** other players' cards are shown as face-down card backs with a numeric count of remaining cards.
3. **Given** a player's hand contains cards, **When** they view the table, **Then** cards are arranged in a readable, non-overlapping layout that fits the browser viewport without horizontal scrolling on a desktop screen.

---

### User Story 4 - Player Rejoins After Accidental Disconnect (Priority: P2)

If a player loses their connection (e.g. tab refresh or brief network drop), they can reopen the game, enter the same room code and display name, and see their hand restored as it was.

**Why this priority**: Disconnects are common in browser-based games. Losing your hand on a refresh would make the game unplayable over the internet.

**Independent Test**: Can be fully tested by refreshing a player's browser tab mid-deal and verifying they rejoin with the same hand intact.

**Acceptance Scenarios**:

1. **Given** a player is on the game table screen, **When** they refresh their browser tab, **Then** they are prompted to re-enter their name and room code, and upon doing so, their original hand is restored.
2. **Given** a player disconnects briefly, **When** they reconnect within 60 seconds, **Then** their seat in the room is preserved and their hand is unchanged.

---

### Edge Cases

- What happens when a player closes the tab permanently? Their seat remains held for 60 seconds then is marked as abandoned; the remaining players continue.
- What if two players submit the same display name in the same room? Each player is identified internally by their socket connection ID; display names are for readability only and duplicates are allowed.
- What if the host disconnects before starting the game? Host privileges transfer to the next connected player in the lobby.
- What if a player joins a room that has already started? They are shown a "Game in progress" message and cannot join mid-game in this slice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a player to create a new game room by providing a display name, generating a unique room code, and entering a lobby screen.
- **FR-002**: The system MUST allow a player to join an existing room by providing a display name and a valid room code.
- **FR-003**: The lobby screen MUST display the list of all currently connected players in the room and update in real time as players join.
- **FR-004**: The host (room creator) MUST see a "Start Game" button that is enabled only when 2 or more players are present.
- **FR-005**: When the host starts the game, the system MUST shuffle a standard 52-card deck and deal cards as evenly as possible among all players (hand sizes differ by at most 1).
- **FR-006**: Each player MUST receive their dealt hand simultaneously and be navigated to the game table screen.
- **FR-007**: The game table MUST display the active player's own cards face-up, showing suit and rank clearly using the react-playing-cards library.
- **FR-008**: The game table MUST display other players' hands as face-down card backs with a visible count of remaining cards.
- **FR-009**: The system MUST preserve a player's hand and seat for at least 60 seconds after a disconnect, allowing rejoin by room code and display name.
- **FR-010**: A player MUST NOT be able to join a room where the game has already started.
- **FR-011**: If the host disconnects before the game starts, host privileges MUST transfer to the next connected player.
- **FR-012**: The display of cards MUST fit within a standard desktop viewport without horizontal scrolling.

### Key Entities

- **Room**: A game session identified by a short code, containing 2–6 players and transitioning from lobby to in-game state.
- **Player**: A participant identified by their socket connection, with a display name and a hand of cards.
- **Hand**: The set of cards currently held by a player. Private to that player; count visible to others.
- **Deck**: A standard 52-card set (4 suits × 13 ranks). Shuffled fresh at game start.
- **Card**: A single playing card with a suit (spades, hearts, diamonds, clubs) and rank (2–A).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two players can go from opening the browser to both seeing their dealt hands in under 2 minutes with no prior instructions beyond the README.
- **SC-002**: All 52 cards are accounted for across all hands after dealing — no duplicates, no missing cards.
- **SC-003**: A player who refreshes their tab can rejoin and see their hand restored within 10 seconds.
- **SC-004**: The game table is usable on any desktop browser viewport of 1280×720 or larger without layout overflow.
- **SC-005**: Real-time lobby updates (player joining) appear on all connected clients within 1 second of the join event.

## Assumptions

- Desktop browser only — mobile layout is out of scope for this slice.
- Players are on the same local network or have a stable internet connection; no special NAT traversal is required.
- No persistent storage — all game state lives in server memory for the duration of the session.
- Room setup & lobby operates over HTTP REST (`/api/rooms`) with 2-second short polling; WebSockets connect upon entering active gameplay.
- The minimum player count to start is 2; the maximum is 6 as agreed during design.
- Display names are not unique enforced — two players can share a name (player ID is the true identifier).
- No chat, no game history, no statistics in this slice.
- The `react-playing-cards` library is used as-is; no custom card artwork is required.
