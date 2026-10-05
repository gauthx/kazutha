# Code Quality Checklist: For Loop → Functional Method Refactoring

**Purpose**: Identify all `for` loops across the codebase that can be cleanly replaced with idiomatic functional methods (`find`, `map`, `filter`, `reduce`, `forEach`, `flatMap`). Documents each refactoring site, the recommended replacement, and any cases intentionally excluded.
**Created**: 2026-10-05
**Feature**: [003-vett spec](../spec.md)

---

## Refactoring Inventory

> [!NOTE]
> Each entry below is a concrete refactoring site. Items marked ✅ are candidates for replacement. Items marked ❌ are intentionally excluded with rationale.

### `backend/src/game/domain/game.ts`

- [x] CHK001 — **Lines 136–145** (`for...of` with manual `handIndex` counter → `map`)  
  **Current code**:
  ```ts
  let handIndex = 0;
  for (const player of playerList) {
    const hand = hands[handIndex] || [];
    player.setHand(hand);
    playerAssignments.push({
      playerId: player.playerId,
      socketId: player.socketId,
      hand: [...player.getHand()],
    });
    handIndex++;
  }
  ```
  **Recommended replacement**:
  ```ts
  const playerAssignments: PlayerHandAssignment[] = playerList.map((player, i) => {
    player.setHand(hands[i] || []);
    return {
      playerId: player.playerId,
      socketId: player.socketId,
      hand: [...player.getHand()],
    };
  });
  ```
  **Method**: `map` with index  
  **Status**: ✅ Refactorable — removes manual counter; semantically a projection over the list  
  [Consistency, Constitution §IV]

- [x] CHK002 — **Lines 150–155** (`for...of` with `break` to locate Ace of Spades → `find`)  
  **Current code**:
  ```ts
  let acePlayerId = '';
  const aceCard: Card = { suit: Suit.SPADES, rank: Rank.A };
  for (const player of playerList) {
    if (player.hasCard(aceCard)) {
      acePlayerId = player.playerId;
      break;
    }
  }
  ```
  **Recommended replacement**:
  ```ts
  const aceCard: Card = { suit: Suit.SPADES, rank: Rank.A };
  const acePlayer = playerList.find((player) => player.hasCard(aceCard));
  if (!acePlayer) {
    throw new Error('Ace of Spades not found in any player hand');
  }
  const acePlayerId = acePlayer.playerId;
  ```
  **Method**: `find`  
  **Status**: ✅ Refactorable — this is the canonical `find` pattern; eliminates mutable `acePlayerId` variable and the `break`; also removes the separate null-check dance  
  [Completeness, Constitution §V – Low Complexity]

---

### `backend/src/game/domain/round.ts`

- [x] CHK003 — **Lines 91–97** (`for` loop with index to find the maximum ranked play → `reduce`)  
  **Current code**:
  ```ts
  let highest = ledPlays[0];
  for (let i = 1; i < ledPlays.length; i++) {
    if (compareRank(ledPlays[i].card.rank, highest.card.rank) > 0) {
      highest = ledPlays[i];
    }
  }
  return highest;
  ```
  **Recommended replacement**:
  ```ts
  return ledPlays.reduce((highest, play) =>
    compareRank(play.card.rank, highest.card.rank) > 0 ? play : highest
  );
  ```
  **Method**: `reduce`  
  **Status**: ✅ Refactorable — `reduce` without an initial value naturally starts from `ledPlays[0]`, making the intent clearer; removes index arithmetic  
  [Clarity, Constitution §V – Low Complexity]

---

### `backend/src/game/deck.service.ts`

- [x] CHK004 — **Lines 32–37** (nested `for...of` to build card deck → `flatMap`)  
  **Current code**:
  ```ts
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
  ```
  **Recommended replacement**:
  ```ts
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
  ```
  **Method**: `flatMap` + `map`  
  **Status**: ✅ Refactorable — two nested push-loops are the textbook `flatMap` case; eliminates mutable accumulator  
  [Clarity, Constitution §V – Low Complexity]

- [x] CHK005 — **Lines 54–57** (`for` loop with index to deal cards into player hands → `reduce`)  
  **Current code**:
  ```ts
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < deck.length; i++) {
    hands[i % numPlayers].push(deck[i]);
  }
  return hands;
  ```
  **Recommended replacement**:
  ```ts
  return deck.reduce<Card[][]>(
    (hands, card, i) => {
      hands[i % numPlayers].push(card);
      return hands;
    },
    Array.from({ length: numPlayers }, () => []),
  );
  ```
  **Method**: `reduce`  
  **Status**: ✅ Refactorable — converts the indexed push loop to a fold. Note: the `push` inside `reduce` is still a mutation of the accumulator sub-array, which is idiomatic in this pattern  
  [Consistency, Constitution §IV]

- [x] CHK006 — **Lines 42–46** (Fisher-Yates in-place shuffle loop)  
  **Current code**:
  ```ts
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  ```
  **Method**: N/A  
  **Status**: ❌ **Intentionally excluded** — Fisher-Yates requires backwards traversal and in-place swapping at specific indices. No functional array method supports this without degrading correctness or readability. The `for` loop is the clearest expression of the algorithm.  
  [Gap — not applicable]

---

### `backend/src/game/game-store.service.ts`

- [x] CHK007 — **Lines 54–61** (nested `for...of` to find player by socket ID across rooms)  
  **Current code**:
  ```ts
  for (const game of this.rooms.values()) {
    for (const player of game.getPlayers()) {
      if (player.socketId === socketId) {
        return { room: game, player };
      }
    }
  }
  return undefined;
  ```
  **Recommended replacement**:
  ```ts
  for (const game of this.rooms.values()) {
    const player = game.getPlayers().find((p) => p.socketId === socketId);
    if (player) return { room: game, player };
  }
  return undefined;
  ```
  **Method**: `find` (inner loop only)  
  **Status**: ✅ Partially refactorable — the outer loop over a `Map.values()` iterator cannot use `find` directly (iterators don't have `.find()`). The inner loop over `Player[]` can be replaced with `find`. Full flattening via `Array.from(this.rooms.values()).flatMap(...)` is possible but adds allocation overhead for a hot path.  
  [Clarity, Constitution §V]

- [x] CHK008 — **Lines 82–87** (`for...of` over Map entries to evict stale rooms)  
  **Current code**:
  ```ts
  for (const [code, game] of this.rooms) {
    if (now - game.lastActivityAt > ROOM_TTL_MS) {
      this.rooms.delete(code);
      this.logger.log(`Evicted inactive room ${code}`);
    }
  }
  ```
  **Method**: N/A  
  **Status**: ❌ **Intentionally excluded** — iterating a `Map` while calling `.delete()` on it is safe in JS/TS (the spec guarantees it), but `forEach` on a Map does not give a clean way to delete the current entry mid-iteration. The `for...of` is the correct construct here.  
  [Gap — not applicable]

---

### `backend/src/rooms/rooms.controller.ts`

- [x] CHK009 — **Lines 121–128** (`for...of` to emit socket events to each player)  
  **Current code**:
  ```ts
  for (const p of result.playerAssignments) {
    if (p.socketId) {
      this.gameGateway.server.to(p.socketId).emit('state-sync', {
        hand: p.hand,
        roomSnapshot: result.snapshot,
      });
    }
  }
  ```
  **Recommended replacement**:
  ```ts
  result.playerAssignments
    .filter((p) => p.socketId)
    .forEach((p) => {
      this.gameGateway.server.to(p.socketId).emit('state-sync', {
        hand: p.hand,
        roomSnapshot: result.snapshot,
      });
    });
  ```
  **Method**: `filter` + `forEach`  
  **Status**: ✅ Refactorable — separates the guard (`filter`) from the effect (`forEach`), making intent more explicit. Both the guard condition and the side effect are now at the right semantic level.  
  [Clarity, Constitution §IV – Consistency]

---

## Summary

| CHK | File | Lines | Method | Refactorable? |
|-----|------|-------|--------|---------------|
| CHK001 | `game/domain/game.ts` | 136–145 | `map` with index | ✅ Yes |
| CHK002 | `game/domain/game.ts` | 150–155 | `find` | ✅ Yes |
| CHK003 | `game/domain/round.ts` | 91–97 | `reduce` | ✅ Yes |
| CHK004 | `game/deck.service.ts` | 32–37 | `flatMap` + `map` | ✅ Yes |
| CHK005 | `game/deck.service.ts` | 54–57 | `reduce` | ✅ Yes |
| CHK006 | `game/deck.service.ts` | 42–46 | — | ❌ Excluded (Fisher-Yates) |
| CHK007 | `game/game-store.service.ts` | 54–61 | `find` (inner) | ✅ Partial |
| CHK008 | `game/game-store.service.ts` | 82–87 | — | ❌ Excluded (Map delete-during-iteration) |
| CHK009 | `rooms/rooms.controller.ts` | 121–128 | `filter` + `forEach` | ✅ Yes |

**Total**: 9 sites surveyed · 6 full refactors · 1 partial · 2 intentionally excluded

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline after refactoring
- All refactors align with Constitution §IV (Consistency) and §V (Low Complexity)
- Run the full unit test suite after each refactor to validate behavioural equivalence
