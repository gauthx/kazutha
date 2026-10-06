# Feature Specification: Player Elimination

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "slice 4 of PLAN.md — Player Elimination: Empty hand → player becomes spectator; last player holding cards is declared Kazhutha"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Player Empties Hand and Becomes Spectator (Priority: P1)

A player whose hand becomes empty after a round resolves is immediately removed from active play and transitions to spectator status. They can still see the game board but cannot take any further turns. Their finishing position is recorded.

**Why this priority**: This is the core elimination mechanic. Without it, the game has no natural end condition — all other stories depend on players being able to finish.

**Independent Test**: Can be tested by setting up a 3-player game where one player is engineered to run out of cards at the end of a round. The player's hand should empty, they should disappear from the active turn order, and the remaining two players should continue uninterrupted.

**Acceptance Scenarios**:

1. **Given** a player's last card is played in a no-vett round (cards discarded), **When** the round resolves, **Then** the player's hand is empty, they are marked as a spectator, and their finishing position is recorded.
2. **Given** a player's last card is played in a vett round, **When** the pile is awarded to another player, **Then** the now-empty player is marked as a spectator and their finishing position is recorded.
3. **Given** a spectator, **When** it would have been their turn in turn-order, **Then** their turn is skipped automatically and the next active player is prompted instead.
4. **Given** a spectator, **When** viewing the game board, **Then** they see the live game state (active players, cards played this round) but have no interactive card controls.

---

### User Story 2 - Last Player Remaining Declared Kazhutha (Priority: P1)

Once all but one player have emptied their hands, the remaining player is declared **Kazhutha** (the loser). The game ends immediately; no further rounds are played.

**Why this priority**: This is the win/loss condition that terminates the game. It is equally critical to Story 1 and must ship in the same slice.

**Independent Test**: Can be tested by simulating a 2-player game where one player plays down to zero cards. The remaining player should immediately be declared Kazhutha and the game state should move to "ended".

**Acceptance Scenarios**:

1. **Given** only one active player remains (all others are spectators), **When** the previous round resolves, **Then** the game state transitions to "ended" and the remaining player is labelled Kazhutha.
2. **Given** the game has ended, **When** a connected player's client receives the update, **Then** all clients display the Kazhutha designation and the final finish order for all players.
3. **Given** two players and one empties their hand in the same round, **When** the round resolves, **Then** the Kazhutha declaration fires before any new round begins.

---

### User Story 3 - Turn Order Integrity with Multiple Eliminations (Priority: P2)

When multiple players finish in close succession, the turn rotation correctly skips all spectators, and the single active player is never asked to play against themselves.

**Why this priority**: Edge-case correctness — failing here would cause the game to hang or behave nonsensically near the end of a game.

**Independent Test**: Can be tested by engineering a 4-player game where players 2 and 3 both become spectators in the same round. The next turn prompt should go to the sole remaining active player (player 4 or player 1 depending on rotation) and the game should resolve as expected.

**Acceptance Scenarios**:

1. **Given** two players become spectators in the same round resolution, **When** the next round begins, **Then** the starter is determined from the surviving active player(s) only.
2. **Given** the player who played the highest card of the led suit empties their hand and becomes a spectator in a no-vett round, **When** the next round is determined, **Then** the player who played the second-highest card of the led suit in that round (or highest among players who still have cards) becomes the starter.
3. **Given** only one active player remains after multi-player simultaneous elimination, **When** the game checks for continuation, **Then** the Kazhutha declaration fires immediately without starting a new round.

---

### Edge Cases

- What happens when the player who played the highest led-suit card empties their hand during a *no-vett* round (cards discarded)? — They become a spectator. The player who played the second-highest card of the led suit in that round starts the next round. If N players in the round finished their hand, whichever player who still has cards remaining and played the highest-ranked card in the led suit starts the next round.
- What happens when the player who played the highest led-suit card (and would normally start the next round) receives the vett pile? — They take all played cards and add them to their hand, so they still have cards and start the next round.
- What if the vett pile is awarded to the only remaining active player and they already had zero cards? — This cannot happen by rule; only players with cards in hand can participate in a round, so the vett-pile recipient is always still active.
- What happens when a player with one card performs a vett (and thus must give that card)? — Their hand becomes empty; they become a spectator with their finishing position recorded, even though they triggered the vett.
- What if only two active players remain and one performs a vett? — The pile goes to the other player; the vett player's hand empties; that player becomes a spectator; the remaining player is immediately declared Kazhutha.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect when a player's hand becomes empty immediately after any round resolution event (no-vett discard or vett-pile award).
- **FR-002**: The system MUST transition an empty-handed player from "active" to "spectator" status before beginning the next round.
- **FR-003**: The system MUST record the finishing position of every player who becomes a spectator, in the order they finished.
- **FR-004**: The turn system MUST skip spectator players when advancing the turn order clockwise.
- **FR-005**: In a no-vett round where the highest-ranked led-suit card player empties their hand, the system MUST select the player who played the second-highest card of the led suit in that round (or highest among players who still hold cards) as the next round starter.
- **FR-006**: The system MUST detect when exactly one active player remains after any round resolution.
- **FR-007**: When only one active player remains, the system MUST immediately end the game and declare that player Kazhutha without starting a new round.
- **FR-008**: The Kazhutha designation MUST be broadcast to all connected clients (active players and spectators) simultaneously.
- **FR-009**: Spectator clients MUST receive live game-state updates (cards played in the current round, active players, turn indicator) but MUST NOT be able to submit card plays.
- **FR-010**: The system MUST correctly handle simultaneous elimination — when multiple players empty their hands in the same round, all must be marked as spectators before the next round begins.

### Key Entities *(include if feature involves data)*

- **Player**: Has a status field (`active` | `spectator`), a hand (list of cards), and a finishing position (null while active, integer rank when eliminated). Spectator players retain their identity and connection but lose play privileges.
- **Game**: Has a status field (`in_progress` | `ended`) and a `kazhutha` reference pointing to the last remaining active player when ended. Tracks finish-order list.
- **Round**: Resolved after all active players have had a turn or a vett has occurred. Resolution triggers elimination checks before the next round begins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every empty-hand event results in the correct player being marked as spectator within the same round-resolution cycle — 0 missed eliminations across all test scenarios.
- **SC-002**: The Kazhutha declaration fires in the same round-resolution step that leaves one player standing — no extra round is started.
- **SC-003**: All connected clients (active and spectator) display the updated game state (elimination event, Kazhutha declaration) within one real-time update cycle with no client left showing a stale active roster.
- **SC-004**: Turn order never routes a play prompt to a spectator player in any tested game scenario.
- **SC-005**: Finish positions for all players are recorded correctly and consistently across 100% of game completions in testing.

## Assumptions

- Cards becoming empty is always a post-round-resolution event, never mid-round (a player's last card is played during their turn; hand emptiness is evaluated after the round fully resolves).
- Spectators remain connected via WebSocket and continue to receive `state-sync` broadcasts; no reconnection or separate spectator handshake is required.
- The finish-order list is stored in memory alongside other game state (consistent with the existing in-memory game store established in Slice 1).
- "Finishing position" is 1-indexed: the first player to empty their hand is position 1 (first winner), and the last remaining player (Kazhutha) is implicitly the last position.
- A player who empties their hand by performing a vett is still subject to elimination: if their last card triggers a vett, they become a spectator after the round resolves (the pile goes to the appropriate player, not them).
- The UI treatment for spectators (what they see, how they are visually distinguished in the player roster) is out of scope for this slice beyond the requirement that they receive live state updates.
