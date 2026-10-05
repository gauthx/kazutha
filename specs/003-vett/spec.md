# Feature Specification: Vett (Round Breaking)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "3rd slice of PLAN.md — Vett. A player without the led suit breaks the round; highest led-suit card player takes the pile and leads next. Caveat: only the first round is playable now."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Vett Breaks the Round (Priority: P1)

A player who does not hold any card of the led suit plays any card from their hand. This action immediately ends the current round. No other players after the vett player take a turn in that round.

**Why this priority**: Vett is the core mechanic that defines Kazhutha; without it, the game cannot progress past rounds where all players hold the same suit.

**Independent Test**: Start a round where at least one active player has no card of the led suit. Verify that as soon as that player plays any card, the round closes and no subsequent player can play.

**Acceptance Scenarios**:

1. **Given** a round is in progress with led suit ♥, and the current player has no ♥ in hand, **When** they play any card (e.g., 7♣), **Then** the round immediately ends — no further players are prompted to play.
2. **Given** a round is in progress, **When** a player who has the led suit tries to play a different-suit card, **Then** the action is rejected and only led-suit cards remain selectable.
3. **Given** a vett has just been played, **When** the turn order is evaluated, **Then** no player after the vett player is allowed to play a card in this round.

---

### User Story 2 — Pile Winner Takes the Cards (Priority: P1)

After a vett ends the round, the player who played the highest-ranked led-suit card before the vett receives all cards that were played in the round — including the vett card itself — and adds them to their hand.

**Why this priority**: This is the direct consequence of a vett and drives the core tension of accumulating cards, which eventually leads to a player becoming the Kazhutha.

**Independent Test**: Play a round that ends with a vett, observe which player held the highest led-suit card, and verify their hand grows by exactly the number of cards played that round.

**Acceptance Scenarios**:

1. **Given** a round ends by vett, **When** the pile winner is determined, **Then** the player who played the highest-ranked card of the led suit among cards played before the vett receives all played cards.
2. **Given** a round ends by vett, **When** cards are redistributed, **Then** the vett card itself is included in the pile received by the winner (it does not go to the vett player).
3. **Given** a round ends by vett with only one led-suit card played before the vett, **When** the winner is determined, **Then** that single led-suit card's player receives the pile.
4. **Given** a round ends by vett, **When** the redistribution is complete, **Then** each player's displayed card count updates to reflect the new hand sizes.

---

### User Story 3 — Pile Winner Leads the Next Round (Priority: P2)

The player who won the pile after a vett becomes the starter of the next round. They may play any card from their (now larger) hand to begin a new round.

**Why this priority**: This determines the flow of play after a vett resolves; without it the game stalls at round boundaries.

**Independent Test**: Confirm that after a vett-resolved round, the correct player (highest led-suit card owner) is presented with the "play a card" prompt to start the next round.

**Acceptance Scenarios**:

1. **Given** a vett-resolved round just ended, **When** the next round begins, **Then** only the pile winner is prompted to play the opening card.
2. **Given** the pile winner leads the next round, **When** they play a card, **Then** a new round starts with the suit of that card as the new led suit and play continues clockwise.

---

### User Story 4 — Clean Round (No Vett) — Starter Determined by Highest Card (Priority: P2)

When all active players follow the led suit and no vett occurs, all played cards are placed face-down and removed from the game. The player who played the highest-ranked card of the led suit starts the next round; they do not receive any cards.

**Why this priority**: This is the complementary path to the vett scenario. Both round-ending outcomes must be correctly handled for the game to function.

**Independent Test**: Arrange a round where every active player has and plays a card of the led suit. Verify that no player's hand grows, the played cards disappear, and the correct player starts the next round.

**Acceptance Scenarios**:

1. **Given** all active players follow the led suit, **When** the last player plays, **Then** the round ends with no vett — no player receives additional cards.
2. **Given** a clean round ends, **When** card disposition is resolved, **Then** all played cards are discarded and removed from every player's visible hand.
3. **Given** a clean round ends, **When** the next round is triggered, **Then** the player who played the highest-ranked led-suit card is designated as starter and plays first.

---

### Edge Cases

- What happens when only one player remains active and has the led-suit card — does the round end cleanly or trigger a vett? (Single player always follows the led suit if they have it; round ends cleanly.)
- How does the system handle a tie in led-suit cards? (Card ranking is strict A > K > … > 2; no ties are possible.)
- What is displayed on-screen between the moment a vett is played and the moment the pile winner is shown? (The vett card appears on the table, then a brief resolution animation/state transitions to show the winner and updated hands.)
- What if the vett player happens to be the first player in the round (i.e., they lead with a card but have no cards of any specific required suit)? (Only the round leader can freely pick any suit; subsequent players must follow. The leader can never vett because led suit follows their card.)
- What happens if only the first round has been played and a player runs out of cards? (Out of scope for this slice; player elimination is Slice 4.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST enforce that a player who holds at least one card of the led suit can only play a card of that suit during the current round.
- **FR-002**: The system MUST allow a player to play any card from their hand when they hold no card of the led suit; this action is a vett.
- **FR-003**: When a vett is played, the system MUST immediately end the current round — no further players after the vett player may play in that round.
- **FR-004**: After a vett, the system MUST determine the highest-ranked led-suit card among all cards played before the vett and designate that card's player as the pile winner.
- **FR-005**: The pile winner MUST receive all cards played in the round (led-suit cards and the vett card) added to their hand.
- **FR-006**: The pile winner MUST be designated as the starter (leader) of the next round.
- **FR-007**: When no vett occurs and all active players have played a led-suit card, the system MUST discard all played cards face-down — no player receives them.
- **FR-008**: After a clean (no-vett) round, the system MUST designate the player who played the highest-ranked led-suit card as the starter of the next round.
- **FR-009**: Each player's displayed hand size MUST update immediately after card redistribution or discard at the end of every round.
- **FR-010**: The system MUST broadcast the round result (vett or clean), the pile winner (if applicable), and updated hand counts to all connected players in real time.
- **FR-011**: Only the round starter may play the opening card; all other players must wait until it is their turn.
- **FR-012**: The first round of the game begins with the player holding A♠; this behaviour is already in place from Slice 2 and must remain intact.

### Key Entities

- **Round**: A sequence of plays beginning with one player's opening card; has a led suit, a list of cards played in order, a vett flag, a pile winner (nullable), and a discard flag.
- **Vett**: The event of a player playing a card of a different suit because they hold no led-suit cards; terminates the round immediately.
- **Pile**: The collection of all cards played in a single round; awarded to the highest led-suit-card player on vett, discarded on clean round.
- **Player Hand**: The current set of cards a player holds; grows when they receive a pile, shrinks when they play cards.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every vett in a test game correctly ends the round on the turn it is played — no additional cards are played by subsequent players in the same round, in 100% of observed rounds.
- **SC-002**: The pile is awarded to the correct player (holder of the highest led-suit card before the vett) in 100% of vett-resolved rounds during testing.
- **SC-003**: A clean round (no vett) results in zero net card gain for any player — total cards in all hands decreases by the number of players who played, every time.
- **SC-004**: All connected players see updated hand sizes within 1 second of a round concluding, under normal network conditions.
- **SC-005**: The correct next-round starter is presented with the play prompt in 100% of round transitions (both vett and clean paths).
- **SC-006**: No invalid card play (wrong-suit when led suit is held) succeeds — the system rejects 100% of such attempts.

## Assumptions

- Slice 1 (deal & hand display) and Slice 2 (A♠ auto-play + suit following) are fully implemented and stable; this slice adds vett resolution on top of that foundation.
- Only the **first round** is playable at the time of this implementation. The spec covers the full vett mechanic so it is designed correctly, but automated multi-round play and player elimination (Slice 4) are not required to be functional here.
- Multiple rounds will work mechanically once Slice 4 is in place; this slice lays the correct state-management groundwork.
- Real-time updates are delivered via the existing Socket.IO connection established in Slice 2; no new transport layer is required.
- There is no trump suit and no tied card ranks, so pile-winner determination is always unambiguous.
- Mobile/tablet responsive layout is not an explicit requirement for this slice but should not regress.
- Game state remains in server memory; no persistence layer is used.
