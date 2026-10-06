# Kazhutha (കഴുത) — Game Rules Specification

## 1. Game Setup

* Use a standard **52-card deck**.
* Deal all cards among the players as evenly as possible.
* The player holding **A♠ (Ace of Spades)** starts the game.
* Play proceeds **clockwise**.
* Players who finish all their cards become **spectators** and no longer participate.

### Card Ranking

Cards are ranked from highest to lowest:

```text
A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
```

There is no trump suit.

---

## 2. Round 

A round begins when an active player plays a card.

The suit of this card becomes the **led suit** for that round.

Example:

```text
Player A plays 7♥
→ Led suit = ♥
```

The game then proceeds clockwise.

---

## 3. Following the Led Suit

For every active player who gets a turn:

### If the player has the led suit

They **must play a card of the led suit**.

They cannot play a card from another suit.

### If the player does not have the led suit

They perform a **വെട്ട് (vett)**.

A `vett` means:

> The player does not have a card belonging to the led suit and therefore plays a card from another suit.

When performing a vett:

* The player may play **any card** from their hand.
* **The round immediately ends.**
* Players after the vett player do **not** play in that round.

---

## 4. Round Ending Because of Vett

When a player performs a `vett`:

1. Players after the vett player do **not** play.
2. Among all cards played **before** the vett, find the **highest-ranked card of the led suit**.
3. The player who played that highest led-suit card takes **all cards played in the current round** (including the vett card).
4. Those cards are added to that player's hand.
5. The player who played the highest led-suit card becomes the **starter of the next round**.

> [!NOTE]
> Only led-suit cards count when determining the winner of the pile. The vett card itself (played from a different suit) does **not** compete.

Example:

```text
A♥ → K♥ → 5♥ → ♣7 (vett)
                         ↓
                  Round immediately ends
                         ↓
         Highest led-suit card before vett = A♥
                         ↓
                  A♥ player takes all cards
                         ↓
                  A♥ player starts next round
```

---

## 5. Round Ending Without Vett

If **every active player plays a card of the led suit**, there is no vett.

In this case:

1. The round ends after every active player has played.
2. Nobody takes the cards.
3. All cards played in that round are placed **face-down**.
4. These cards are removed from the game and are no longer in any player's hand.
5. Determine the **highest-value card played in the led suit**.
6. The player who played that highest card becomes the **starter of the next round**, provided they still have cards remaining.

### Important: Starter when players finish their hand

* The highest card **does not take the cards**. It only determines **who starts the next round**.
* If the player who played the highest card finishes their hand (0 cards left), they become a spectator and cannot lead. In this case, the player who played the **second-highest** card of the led suit in that round starts the next round.
* If multiple (N) players in the round finish their hands, whichever player **still has cards remaining** and played the highest-ranked card in the led suit starts the next round.

---

## 6. Players Who Finish Their Cards

A player wins immediately when their hand becomes empty.

When this happens:

* Mark the player as **finished/winner**.
* Remove them from active gameplay.
* They become a **spectator**.
* They do not participate in future rounds.
* Their finishing position is recorded.

When determining the next player, skip all spectators.

---

## 7. Game End

The game continues until only one active player remains.

The last remaining player with cards is:

**കഴുത (Kazhutha / Donkey)**

That player is the loser.

All other players have finished and are winners.

---

## 8. Turn and Round Logic

### Starting the game

```text
Find player holding A♠
        ↓
That player starts Round 1
```

### If a vett occurs

```text
Player without led suit
        ↓
Plays any card (VETT)
        ↓
Round immediately ends
        ↓
Find highest led-suit card played before vett
        ↓
That card's player takes all played cards
        ↓
That card's player starts next round
```

### If no vett occurs

```text
Everyone follows led suit
        ↓
Round ends
        ↓
All played cards go face-down
        ↓
Find player with cards remaining who played highest card of led suit
(if highest finished, second-highest starts; if N finished, highest among remaining players starts)
        ↓
That player starts next round
```

---

## 9. Important Implementation Rules

* Do **not** allow a player to play after a `vett`.
* Do **not** allow a player to play a different suit if they have the led suit.
* A `vett` player does **not** automatically take the cards.
* When a `vett` occurs, find the **highest-ranked led-suit card** played before the vett — that card's player takes all cards in the round (including the vett card) and **starts the next round**.
* If nobody performs a `vett`, all played cards are discarded face-down.
* When there is no vett, the player who played the **highest card of the led suit among players who still have cards remaining** starts the next round. If the highest card player finishes their hand, the second-highest starts; if N players finish, the highest remaining card holder starts.
* The highest card does **not** take the cards when there is no vett.
* Players with zero cards are spectators and must be skipped.
* The initial starter is the player holding **A♠**.
* There is no trump suit.
* Card ranking is:

```text
A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
```

---


### Core invariant

> A player who has the led suit **must** play that suit.

> A player may play a different suit only when they have **no card of the led suit**. This is a `vett`, and it immediately ends the round.
