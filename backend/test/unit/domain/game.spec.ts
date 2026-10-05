import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../../src/game/domain/game.js';
import { Player } from '../../../src/game/domain/player.js';
import { Suit, Rank, GameStatus, ErrorCode } from '../../../src/game/constants.js';
import { GameError } from '../../../src/game/errors.js';
import type { Card } from '../../../src/game/domain/game.js';

describe('Game Aggregate Root', () => {
  let game: Game;
  let p1: Player;
  let p2: Player;
  let p3: Player;

  const cardSpadesA: Card = { suit: Suit.SPADES, rank: Rank.A };
  const cardSpadesK: Card = { suit: Suit.SPADES, rank: Rank.K };
  const cardSpadesQ: Card = { suit: Suit.SPADES, rank: Rank.Q };
  const cardSpades2: Card = { suit: Suit.SPADES, rank: Rank.TWO };
  const cardHeartsA: Card = { suit: Suit.HEARTS, rank: Rank.A };
  const cardHeartsK: Card = { suit: Suit.HEARTS, rank: Rank.K };
  const cardClubs10: Card = { suit: Suit.CLUBS, rank: Rank.TEN };

  beforeEach(() => {
    game = new Game({ roomCode: 1000 });
    p1 = new Player({ playerId: 'p1', displayName: 'Player 1' });
    p2 = new Player({ playerId: 'p2', displayName: 'Player 2' });
    p3 = new Player({ playerId: 'p3', displayName: 'Player 3' });
    game.addPlayer(p1);
    game.addPlayer(p2);
    game.addPlayer(p3);
  });

  describe('Game Initialization and Ace of Spades Auto-play', () => {
    it('holder of A♠ starts the game and A♠ is automatically played and removed from hand', () => {
      const hands: Card[][] = [
        [cardHeartsK, cardClubs10],
        [cardSpadesA, cardSpadesK], // p2 holds A♠
        [cardHeartsA, cardSpadesQ],
      ];

      const { autoPlayedCard, playerAssignments } = game.start(hands);

      expect(game.status).toBe(GameStatus.IN_PROGRESS);
      expect(autoPlayedCard.playerId).toBe('p2');
      expect(autoPlayedCard.card).toEqual(cardSpadesA);

      // A♠ must NOT be present in p2 hand
      expect(p2.hasCard(cardSpadesA)).toBe(false);
      expect(p2.cardCount).toBe(1);

      // p2 assignment also reflects hand without A♠
      const p2Assign = playerAssignments.find((a) => a.playerId === 'p2');
      expect(p2Assign?.hand).toEqual([cardSpadesK]);

      // Round 1 started with spades led, current turn is next player (p3)
      const currentRound = game.getCurrentRound();
      expect(currentRound).not.toBeNull();
      expect(currentRound?.ledSuit).toBe(Suit.SPADES);
      expect(currentRound?.starterPlayerId).toBe('p2');
      expect(currentRound?.currentTurnPlayerId).toBe('p3');
    });

    it('rejects starting when fewer than 2 players or already in progress', () => {
      const emptyGame = new Game({ roomCode: 1001 });
      expect(() => emptyGame.start([])).toThrow(GameError);

      const hands: Card[][] = [
        [cardHeartsK],
        [cardSpadesA],
        [cardHeartsA],
      ];
      game.start(hands);
      expect(() => game.start(hands)).toThrow(GameError);
    });

    it('cannot play out of turn or play a card not in hand', () => {
      const hands: Card[][] = [
        [cardHeartsK],
        [cardSpadesA, cardSpadesK],
        [cardSpadesQ],
      ];
      game.start(hands); // Turn is p3

      // Out of turn
      expect(() => game.playCard('p1', cardHeartsK)).toThrow(GameError);
      try {
        game.playCard('p1', cardHeartsK);
      } catch (err: any) {
        expect(err.code).toBe(ErrorCode.NOT_YOUR_TURN);
      }

      // Card not in hand
      expect(() => game.playCard('p3', cardHeartsK)).toThrow(GameError);
      try {
        game.playCard('p3', cardHeartsK);
      } catch (err: any) {
        expect(err.code).toBe(ErrorCode.CARD_NOT_IN_HAND);
      }
    });
  });

  describe('Following Suit & No-Vett Rule', () => {
    it('forces player to follow led suit when they hold cards of that suit', () => {
      const hands: Card[][] = [
        [cardSpades2],
        [cardSpadesA, cardHeartsK],
        [cardSpadesQ, cardHeartsA], // p3 has spades and hearts
      ];
      game.start(hands); // Turn is p3, led suit is SPADES

      expect(() => game.playCard('p3', cardHeartsA)).toThrow(GameError);
      try {
        game.playCard('p3', cardHeartsA);
      } catch (err: any) {
        expect(err.code).toBe(ErrorCode.MUST_FOLLOW_SUIT);
      }

      // Legal play succeeds
      const result = game.playCard('p3', cardSpadesQ);
      expect(result.roundEnded).toBe(false);
      expect(p3.hasCard(cardSpadesQ)).toBe(false);
    });

    it('completes clean round when all active players follow suit and highest led card leads next', () => {
      // p1 holds A♠, p2 holds K♠, p3 holds 2♠
      const hands: Card[][] = [
        [cardSpadesA, cardHeartsK], // p1
        [cardSpadesK, cardClubs10], // p2
        [cardSpades2, cardHeartsA], // p3
      ];
      game.start(hands); // p1 auto-plays A♠. Turn goes p2 -> p3 -> p1

      // p2 plays K♠
      const play2 = game.playCard('p2', cardSpadesK);
      expect(play2.roundEnded).toBe(false);

      // p3 plays 2♠ -> round completes! (p1 played A♠, p2 played K♠, p3 played 2♠)
      const play3 = game.playCard('p3', cardSpades2);
      expect(play3.roundEnded).toBe(true);
      expect(play3.isVett).toBe(false);
      expect(play3.pileWinnerPlayerId).toBeUndefined();
      expect(play3.discardedCards).toHaveLength(3);
      // p1 had A♠ which is highest led card, so p1 starts next round
      expect(play3.nextStarterPlayerId).toBe('p1');
      expect(game.getCurrentRound()).toBeNull();
      expect(game.getNextRoundStarterId()).toBe('p1');

      // Neither player collected the discarded cards
      expect(p1.cardCount).toBe(1);
      expect(p2.cardCount).toBe(1);
      expect(p3.cardCount).toBe(1);

      // p1 leads round 2 by playing K♥
      const round2Start = game.playCard('p1', cardHeartsK);
      expect(round2Start.roundEnded).toBe(false);
      expect(p1.hasCard(cardHeartsK)).toBe(false);
      const r2 = game.getCurrentRound();
      expect(r2).not.toBeNull();
      expect(r2?.roundNumber).toBe(2);
      expect(r2?.ledSuit).toBe(Suit.HEARTS);
      expect(r2?.currentTurnPlayerId).toBe('p2');
    });
  });

  describe('Vett Rule', () => {
    it('triggers vett when player lacks led suit: immediately ends round, highest led-suit card player collects all cards and starts next round', () => {
      const hands: Card[][] = [
        [cardSpadesA, cardSpadesK],
        [cardHeartsK, cardClubs10],
        [cardSpadesQ, cardHeartsA],
      ];
      game.start(hands);

      const result = game.playCard('p2', cardHeartsK);

      expect(result.roundEnded).toBe(true);
      expect(result.isVett).toBe(true);
      expect(result.discardedCards).toEqual([]);
      expect(result.pileWinnerPlayerId).toBe('p1');
      expect(result.nextStarterPlayerId).toBe('p1');

      expect(game.getCurrentRound()).toBeNull();
      expect(game.getNextRoundStarterId()).toBe('p1');

      expect(p1.hasCard(cardSpadesA)).toBe(true);
      expect(p1.hasCard(cardHeartsK)).toBe(true);
      expect(p1.hasCard(cardSpadesK)).toBe(true);
      expect(p1.cardCount).toBe(3);

      expect(p2.hasCard(cardHeartsK)).toBe(false);
      expect(p2.cardCount).toBe(1);

      expect(p3.cardCount).toBe(2);

      // p1 leads round 2 with K♠
      const round2Start = game.playCard('p1', cardSpadesK);
      expect(round2Start.roundEnded).toBe(false);
      expect(p1.hasCard(cardSpadesK)).toBe(false);
      const r2 = game.getCurrentRound();
      expect(r2).not.toBeNull();
      expect(r2?.roundNumber).toBe(2);
      expect(r2?.ledSuit).toBe(Suit.SPADES);
      expect(r2?.currentTurnPlayerId).toBe('p2');
    });

    it('awards pile to highest led-suit card player when multiple led-suit cards played before vett', () => {
      const cardSpades2 = { suit: Suit.SPADES, rank: Rank.TWO };
      const hands: Card[][] = [
        [cardSpades2],
        [cardSpadesA, cardHeartsK],
        [cardSpadesK, cardClubs10],
        [cardHeartsA, cardClubs10],
      ];
      const game4 = new Game({ roomCode: 1004 });
      const pl1 = new Player({ playerId: 'pl1', displayName: 'P1' });
      const pl2 = new Player({ playerId: 'pl2', displayName: 'P2' });
      const pl3 = new Player({ playerId: 'pl3', displayName: 'P3' });
      const pl4 = new Player({ playerId: 'pl4', displayName: 'P4' });
      game4.addPlayer(pl1);
      game4.addPlayer(pl2);
      game4.addPlayer(pl3);
      game4.addPlayer(pl4);

      game4.start(hands);
      const play3 = game4.playCard('pl3', cardSpadesK);
      expect(play3.roundEnded).toBe(false);

      const play4 = game4.playCard('pl4', cardHeartsA);
      expect(play4.roundEnded).toBe(true);
      expect(play4.isVett).toBe(true);
      expect(play4.pileWinnerPlayerId).toBe('pl2');
      expect(play4.nextStarterPlayerId).toBe('pl2');

      expect(pl2.cardCount).toBe(4);
      expect(pl4.cardCount).toBe(1);
      expect(pl1.cardCount).toBe(1);
    });
  });

  describe('Finishing Players & Kazhutha Detection', () => {
    it('marks player as spectator when hand is empty and skips them in turn calculation', () => {
      // 2 player game
      const twoPlayerGame = new Game({ roomCode: 2000 });
      const playerA = new Player({ playerId: 'A', displayName: 'A' });
      const playerB = new Player({ playerId: 'B', displayName: 'B' });
      twoPlayerGame.addPlayer(playerA);
      twoPlayerGame.addPlayer(playerB);

      // Player A has only A♠. Player B has 2♠, 10♣
      twoPlayerGame.start([
        [cardSpadesA],
        [cardSpades2, cardClubs10],
      ]);

      // Player A hand is now 0 cards immediately after auto-play
      // Player B plays 2♠
      twoPlayerGame.playCard('B', cardSpades2);

      // Round resolved. Player A finished 1st!
      expect(playerA.isSpectator()).toBe(true);
      expect(playerA.getFinishPosition()).toBe(1);

      // Only Player B remains active -> Player B is Kazhutha, game finishes!
      expect(twoPlayerGame.status).toBe(GameStatus.FINISHED);
      expect(twoPlayerGame.getFinishOrder()).toEqual(['A', 'B']);
    });
  });
});
