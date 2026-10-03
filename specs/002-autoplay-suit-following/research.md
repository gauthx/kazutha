# Research: A-Spade Auto-play & Suit Following

**Feature**: Slice 2 — Auto-play & Suit Following
**Date**: 2026-09-30

---

## 1. Round State Machine in NestJS

**Decision**: A strongly-typed `RoundState` interface embedded directly on `GameRoom` (`room.currentRound: RoundState | null`), with all game rule logic in pure domain functions in `round-engine.ts` invoked by `GameService`.

**Rationale**: Keeps room state atomic inside `GameStoreService` (single owner — Constitution III). Pure functions `(roundState, action) → nextRoundState` are unit-testable without mocking NestJS or WebSockets (Constitution I, V). `RoomSnapshot` can embed `currentRound: RoundSnapshot | null` making broadcasts synchronous and simple.

**Alternatives considered**:
- *Separate `RoundService` with its own `Map<number, RoundState>`*: Rejected — dual sources of truth and sync bugs when rooms are evicted (violates III, II).
- *Flat properties directly on `GameRoom`* (`room.ledSuit`, `room.currentTurn`, `room.playedCards`): Rejected — clutter, error-prone resets between rounds, cannot cleanly model transitions.

---

## 2. A♠ Auto-play on Game Start

**Decision**: Execute A♠ auto-play synchronously on the server inside `GameService.startGame()`, immediately after dealing. The gateway broadcasts the resulting state to the room via `this.server.to(roomCode).emit(...)`. No client round-trip, no `setTimeout`.

**Rationale**: Dealing and playing A♠ are part of the atomic initial state construction of a Kazhutha match. The game never enters an illegal intermediate state (cards dealt but A♠ unplayed). Standard NestJS push pattern for server-initiated events uses the injected `@WebSocketServer() server: Server`. Reconnecting clients receive the correct post-autoplay state via `state-sync` without any blocking.

**Alternatives considered**:
- *Client-driven auto-play (server instructs client to emit `play-card`)*: Rejected — violates authoritative server principle, breaks on client lag/disconnect/manipulation.
- *Delayed `setTimeout`*: Rejected — introduces race conditions; spec mandates instant transition.

---

## 3. Suit-Following Enforcement

**Decision**: Dual-layer — **server is authoritative**, client pre-filters for UX. Server validates on every `play-card` event: (1) correct turn, (2) player holds the card, (3) player has led-suit cards, (4) played card matches led suit. Rejects with `MUST_FOLLOW_SUIT` error code. Client greys out off-suit cards when player holds the led suit.

**Rationale**: Server enforcement provides authoritative integrity. Client pre-filtering prevents accidental clicks and avoids wasted error round-trips. Satisfies FR-005 (prevent) + FR-006 (communicate rejection).

**Alternatives considered**:
- *Server-only*: Poor UX — error banners on every accidental click.
- *Client-only*: Anti-pattern — allows rule bypass via socket spoofing.

---

## 4. Optimistic vs Authoritative Turn Advancement

**Decision**: Purely **server-driven authoritative turn advancement**. Client applies only an ephemeral `isSubmitting` flag (disables card while ack is pending) to prevent double-clicks. All state transitions (turn advance, round resolution, skip disconnected players) apply strictly upon receiving server broadcasts.

**Rationale**: Round resolution in Kazhutha involves server-determined choices (highest led-suit card, next round starter) that the client cannot predict without duplicating server logic. Optimistic rollback on rejection creates jarring UX flicker. WebSocket RTT < 50 ms — optimism has no perceptual benefit.

**Alternatives considered**:
- *Full optimistic prediction*: Rejected — desync vulnerability, complex rollback.
- *Optimistic card removal with deferred turn advance*: Rejected — card removal still requires rollback on server rejection.

---

## 5. Frontend Turn Indicator Pattern

**Decision**: All turn indicators, player highlights, and card interaction states are **purely derived from `roomSnapshot.currentRound` and `hand`** — no local state copies, no `useEffect` sync.

```typescript
const isMyTurn = roomSnapshot.currentRound?.currentTurnPlayerId === localPlayerId;
const ledSuit  = roomSnapshot.currentRound?.ledSuit ?? null;
const hasLedSuit = ledSuit ? hand.some(c => c.suit === ledSuit) : false;

const isPlayable = (card: Card): boolean => {
  if (!isMyTurn) return false;
  if (!ledSuit) return true;
  if (hasLedSuit) return card.suit === ledSuit;
  return true; // vett condition — no led-suit cards
};
```

**Rationale**: Single source of truth eliminates sync bugs across components. Reconnection hydration is automatic (`state-sync` → snapshot updates → UI reacts). Local state is limited to transient UI only (`isSubmitting`).

**Alternatives considered**:
- *`useEffect` sync to local state*: Rejected — stale closures, sync lag, duplicate state.
- *External store (Zustand/Redux)*: Rejected — unjustified complexity for this scope (Constitution II).
