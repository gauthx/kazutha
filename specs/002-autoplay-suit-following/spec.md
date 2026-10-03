# Feature Specification: A-Spade Auto-play & Suit Following

**Created**: 2026-09-30

**Status**: Draft

**Input**: Feature slice 2 from PLAN.md — "A-spade Auto-play + Suit Following: Game starts automatically (A spade played), led suit is enforced, clean rounds resolve (no vett)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Starts Automatically with A♠ (Priority: P1)

Once the host starts the game and cards are dealt, the player holding the Ace of Spades automatically plays it to open the first round. No manual action is required from any player — the game enters its first round immediately, with A♠ as the first played card and spades as the led suit.

**Why this priority**: Auto-play of A♠ is the entry point to every round of gameplay. Without it, the game never gets off the lobby screen into active play. All other gameplay mechanics depend on rounds existing.

**Independent Test**: Two players join, the host starts the game. Immediately upon entering the game table, one player's A♠ is visibly played on the table, the led suit indicator shows spades, and it is the next player's turn — without any player pressing a button.

**Acceptance Scenarios**:

1. **Given** the game has started and cards are dealt, **When** the game table loads, **Then** the player holding A♠ sees it automatically played on their behalf and the game table shows A♠ as the current round's first card with spades as the led suit.
2. **Given** A♠ has been auto-played, **When** the next player's turn arrives, **Then** the led suit is spades and all suit-following rules apply from that point forward.
3. **Given** A♠ has been auto-played, **When** any player views the game table, **Then** the table clearly shows whose turn it is, the led suit, and the card(s) already played in this round.

---

### User Story 2 - Players Must Follow the Led Suit (Priority: P1)

During a round, if a player has one or more cards matching the led suit, they must play one of those cards. The game enforces this rule — cards of other suits are visually greyed out or unclickable when the player has the led suit available.

**Why this priority**: Suit following is the core gameplay constraint. Without enforcement, the game plays incorrectly. This story is as foundational as the A♠ auto-play — both must land together for the first playable round to be meaningful.

**Independent Test**: Start a game. On any player's turn, if they hold cards of the led suit, attempt to play a card of a different suit. The attempt must be blocked, and a clear message must indicate why. Then play a led-suit card successfully.

**Acceptance Scenarios**:

1. **Given** it is a player's turn and they hold at least one card of the led suit, **When** they attempt to play a card of a different suit, **Then** the play is rejected and the player is shown a message indicating they must follow the led suit.
2. **Given** it is a player's turn and they hold at least one card of the led suit, **When** they play a card of the led suit, **Then** the card is accepted, added to the round's played cards, and the turn advances to the next active player.
3. **Given** it is a player's turn and they hold no card of the led suit, **When** they view their hand, **Then** all cards are playable (this is the vett condition — out of scope for this slice, but the hand must not be incorrectly restricted).

---

### User Story 3 - Clean Round Resolves Without Vett (Priority: P1)

When every active player has played a card of the led suit (no vett occurs), the round ends cleanly: all played cards are removed from the game (face-down), the player who played the highest-ranked led-suit card becomes the starter of the next round, and a new round begins.

**Why this priority**: Round resolution is what makes the game loop work. Without it, a round plays but never ends, and the game is stuck. This must be delivered in the same slice as suit following.

**Independent Test**: Start a 2-player game. Both players follow the led suit. After both play, confirm the cards disappear from the table, the correct player (who played the highest led-suit card) leads the next round, and the game table refreshes to a new empty round state.

**Acceptance Scenarios**:

1. **Given** every active player has played a card of the led suit, **When** the last player plays their card, **Then** all played cards are removed from the table and no player's hand grows.
2. **Given** all players followed the led suit, **When** the round resolves, **Then** the player who played the highest-ranked card of the led suit becomes the starter of the next round and the game table indicates it is their turn to lead.
3. **Given** a clean round just ended, **When** the round starter leads the next round, **Then** the led suit resets to the suit of the newly played card and suit-following rules apply again.
4. **Given** a tie in rank is impossible (standard 52-card deck, no duplicates), **When** the round resolves, **Then** exactly one player is designated as the next starter.

---

### Edge Cases

- What if the player holding A♠ disconnects before the auto-play fires? The auto-play should still be recorded server-side and transmitted to the reconnecting player on rejoin; the round proceeds without waiting for the disconnected client.
- What if a player tries to play out of turn? The play must be rejected silently or with a clear "not your turn" message; no state change occurs.
- What if only one player is active (all others disconnected)? The round still follows the same resolution rules; disconnected players' turns are skipped if they exceed the reconnect window.
- What if a round has only one active player (game is almost over)? This edge case belongs to Slice 3 (vett) and Slice 4 (elimination) — out of scope here.
- What if the led suit card ranking results in ambiguity? Card ranking is strict (A > K > Q > J > 10 > 9 > … > 2, no trump suit) with no ties possible in a standard deck; no ambiguity can occur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically play A♠ on behalf of the player holding it when the game transitions from lobby to in-progress, without requiring any player input.
- **FR-002**: The system MUST set the led suit for Round 1 to spades as a consequence of the A♠ auto-play.
- **FR-003**: The system MUST display the current round's played cards and the led suit to all players in real time.
- **FR-004**: The system MUST display whose turn it is to all players at all times during an active round.
- **FR-005**: The system MUST prevent a player from playing a card of a suit other than the led suit when that player holds at least one card of the led suit.
- **FR-006**: When a player attempts an illegal play (wrong suit with led suit available), the system MUST reject it and communicate the reason to the player.
- **FR-007**: When all active players have played a card of the led suit, the system MUST end the round and remove all played cards from the game permanently.
- **FR-008**: The system MUST identify the player who played the highest-ranked led-suit card and designate them as the starter of the next round.
- **FR-009**: The system MUST advance to the next round and clear the played-card area, with the designated starter being first to play.
- **FR-010**: The system MUST skip disconnected or inactive players' turns during a round, progressing to the next connected active player.
- **FR-011**: The system MUST enforce that only the current turn holder can play a card; plays from any other player must be rejected.

### Key Entities

- **Round**: One cycle of play from the first card played (led card) to round resolution. Tracks the led suit, ordered list of played cards, and the current turn holder.
- **PlayedCard**: A single card played in the current round, associated with the player who played it and its position in play order.
- **TurnOrder**: The clockwise sequence of active players, starting from the current round's starter and skipping spectators/disconnected players.
- **RoundResult**: The outcome of a completed round — which cards were discarded, who leads next. Vett-triggered results are out of scope for this slice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the moment the host clicks "Start Game", A♠ appears on the game table and it is the next player's turn within 2 seconds on a standard local/internet connection.
- **SC-002**: A player holding led-suit cards cannot successfully play an off-suit card under any sequence of interactions — 0% bypass rate.
- **SC-003**: A clean round (all players follow suit) resolves and the next round begins within 1 second of the last card being played.
- **SC-004**: The game table is consistent across all connected players' screens at all times — no player sees a stale or incorrect state for more than 1 second after any game event.
- **SC-005**: Two players can complete 5 consecutive clean rounds (no vett) without any manual intervention beyond selecting which card to play.

## Assumptions

- This slice deliberately excludes vett (a player playing off-suit when they lack the led suit) — that is Slice 3. If a player has no led-suit cards, all their cards appear playable but the outcome (vett resolution) is deferred.
- Play order is clockwise as established in Slice 1 (room player order is treated as clockwise sequence).
- The A♠ auto-play fires server-side on game start and is broadcast to all clients; the client that happens to hold A♠ does not need to initiate it.
- Desktop browser only — mobile is out of scope.
- Disconnected players are skipped after the existing 60-second rejoin window (established in Slice 1).
- No animations or card-play sound effects are required for this slice — functional state transitions only.
- The game table UI from Slice 1 is the baseline; this slice adds the round-play area and turn indicator to it.
