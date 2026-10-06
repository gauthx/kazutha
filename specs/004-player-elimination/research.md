# Research: Player Elimination & Kazhutha Resolution

**Feature**: 004-player-elimination  
**Status**: Completed

## Findings & Architectural Decisions

### 1. Timing of Player Elimination (Mid-Play vs Round Resolution)

- **Context**: In Kazhutha, a player plays a card on their turn, potentially leaving their hand with 0 cards. However, if another player plays a Vett later in that round, the highest led-suit player takes all played cards (including their own).
- **Decision**: Hand exhaustion MUST be resolved when the round resolves (either upon Vett completion or after all active players follow suit), NOT immediately when `removeCard` is called during a turn.
- **Rationale**: If a player with 1 card plays a high card in the led suit (or leads), and a later player executes a Vett, the highest led-suit player takes the entire trick pile. If they were marked as finished mid-round upon playing their last card, they would erroneously be eliminated before taking the pile. Evaluating `checkPlayerFinished` after round resolution (and after any pile is awarded) ensures that only players whose hands remain empty post-resolution transition to spectator status.
- **Alternatives Considered**: 
  - *Immediate elimination with rollback*: Marking a player finished immediately, and reverting if they win a Vett pile. Rejected because rollback complicates state history, emits erroneous intermediate snapshots to clients, and violates Encapsulated State principles.

---

### 2. Next Round Starter When Trick Winner Empties Hand

- **Context**: In a no-vett round where all active players followed suit, the player with the highest card in the led suit normally starts the next round. If that player played their last card during this round, they now have 0 cards and become a spectator.
- **Decision**: When the player who played the highest card in the led suit empties their hand and becomes a spectator, the starter for the next round is the player who played the **second-highest** card of the led suit in that round (provided they still have cards). If multiple (N) players in the round finish their hands, whichever player **still has cards remaining** and played the highest-ranked card in the led suit starts the next round.
- **Rationale**: Prioritizes trick performance among the remaining active players. Rather than arbitrary clockwise rotation, players who played higher cards in the trick earn priority to lead the subsequent round if the trick winner finishes their hand.
- **Alternatives Considered**:
  - *Clockwise active rotation from trick winner*: Rejected per updated game rules specification in favor of highest remaining card holder from the trick.

---

### 3. Game Over Detection & Kazhutha Designation

- **Context**: The game terminates when only one active player with cards remains. That sole player is declared Kazhutha (the donkey / loser).
- **Decision**: Trigger `checkGameOver()` at every round resolution boundary (both clean no-vett completion and vett completion). When `activePlayers.length <= 1`, set game status to `FINISHED`, assign the final remaining player to `finishOrder` (rank N), set `kazhuthaPlayerId`, and emit the final snapshot.
- **Rationale**: Ensures the game immediately transitions to `FINISHED` without prompting or beginning an invalid round where 1 player is left alone.
- **Alternatives Considered**:
  - *Wait until next round start command*: Rejected because asking the lone remaining player to lead against themselves is confusing and causes invalid state.

---

### 4. Turn Rotation & Spectator Skipping

- **Context**: `Round.turnOrder` must never include spectators.
- **Decision**:
  - `getActiveTurnOrder(starterPlayerId)` already filters `this.players` by `!p.isSpectator()`.
  - When constructing a new `Round`, `turnOrder` is generated strictly using `getActiveTurnOrder(starterPlayerId)`.
  - In `playCard`, attempts by spectator players are rejected with `NOT_YOUR_TURN`.
- **Rationale**: Keeps `Round` encapsulated: a `Round` only knows about the participants active for that trick.

---

### 5. Snapshot & Real-time Broadcast Contract

- **Context**: Frontend clients need to know:
  - Which players are spectators vs active (`PlayerPublic.isSpectator`, `PlayerPublic.finishPosition`).
  - Which player is Kazhutha and what the finish order is (`RoomSnapshot.kazhuthaPlayerId`, `RoomSnapshot.finishOrder`).
- **Decision**:
  - Enrich `PlayerPublic` in `@shared/types` with optional `isSpectator: boolean` and `finishPosition: number | null`.
  - Enrich `RoomSnapshot` in `@shared/types` with optional `kazhuthaPlayerId: string | null` and `finishOrder: string[]`.
  - Emit updated snapshots through standard `room-update`, `round-ended`, and `state-sync` events.
- **Rationale**: Minimal additive change to shared contracts; non-breaking for existing UI components while providing full data fidelity for spectator and end-game detection.
