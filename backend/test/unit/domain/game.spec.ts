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
      const twoPlayerGame = new Game({ roomCode: 2000 });
      const playerA = new Player({ playerId: 'A', displayName: 'A' });
      const playerB = new Player({ playerId: 'B', displayName: 'B' });
      twoPlayerGame.addPlayer(playerA);
      twoPlayerGame.addPlayer(playerB);

      twoPlayerGame.start([
        [cardSpadesA],
        [cardSpades2, cardClubs10],
      ]);

      twoPlayerGame.playCard('B', cardSpades2);

      expect(playerA.isSpectator()).toBe(true);
      expect(playerA.getFinishPosition()).toBe(1);
      expect(twoPlayerGame.status).toBe(GameStatus.FINISHED);
      expect(twoPlayerGame.getFinishOrder()).toEqual(['A', 'B']);
    });

    it('evaluates elimination only after round resolution, allowing trick recipient in vett to retain cards', () => {
      const hands: Card[][] = [
        [cardSpadesA], // p1 has only A♠
        [cardSpadesK, cardClubs10],
        [cardHeartsA, cardClubs10], // p3 has no spades, will vett
      ];

      game.start(hands);
      expect(p1.cardCount).toBe(0);

      // p2 plays K♠ (on-suit)
      game.playCard('p2', cardSpadesK);
      // p3 plays A♥ (vett)
      const vettResult = game.playCard('p3', cardHeartsA);

      expect(vettResult.roundEnded).toBe(true);
      expect(vettResult.isVett).toBe(true);
      expect(vettResult.pileWinnerPlayerId).toBe('p1');

      // p1 took the pile (A♠, K♠, A♥) so p1 is NOT eliminated
      expect(p1.cardCount).toBe(3);
      expect(p1.isSpectator()).toBe(false);
      expect(p1.getFinishPosition()).toBeNull();
    });

    it('skips spectators in subsequent turn order and rejects spectator plays', () => {
      const hands: Card[][] = [
        [cardSpadesA, cardHeartsK],
        [cardSpadesK], // p2 has only K♠, will empty hand in round 1
        [cardSpadesQ, cardHeartsA],
      ];

      game.start(hands);
      // p2 plays K♠
      game.playCard('p2', cardSpadesK);
      // p3 plays Q♠
      const round1End = game.playCard('p3', cardSpadesQ);

      expect(round1End.roundEnded).toBe(true);
      expect(p2.cardCount).toBe(0);
      expect(p2.isSpectator()).toBe(true);
      expect(p2.getFinishPosition()).toBe(1);

      // Next starter is p1 (highest led-suit was A♠)
      expect(round1End.nextStarterPlayerId).toBe('p1');

      // Spectator p2 attempting to play throws NOT_YOUR_TURN
      expect(() => game.playCard('p2', cardHeartsK)).toThrow(GameError);
      try {
        game.playCard('p2', cardHeartsK);
      } catch (err: any) {
        expect(err.code).toBe(ErrorCode.NOT_YOUR_TURN);
      }

      // p1 leads round 2 with K♥
      const leadResult = game.playCard('p1', cardHeartsK);
      expect(leadResult.roundEnded).toBe(false);

      // Round 2 turn order must be [p1, p3], skipping spectator p2
      const round2 = game.getCurrentRound();
      expect(round2?.currentTurnPlayerId).toBe('p3');
    });

    it('eliminates a player who empties their hand by playing a vett card', () => {
      const hands: Card[][] = [
        [cardSpadesA, cardHeartsK],
        [cardSpadesK, cardHeartsA],
        [cardClubs10], // p3 has only 10♣ (vett card)
      ];

      game.start(hands);
      game.playCard('p2', cardSpadesK);
      const vettPlay = game.playCard('p3', cardClubs10);

      expect(vettPlay.roundEnded).toBe(true);
      expect(vettPlay.isVett).toBe(true);
      expect(p3.cardCount).toBe(0);
      expect(p3.isSpectator()).toBe(true);
      expect(p3.getFinishPosition()).toBe(1);
    });

    it('declares the last remaining player as Kazhutha upon 2-player game resolution', () => {
      const twoPlayerGame = new Game({ roomCode: 2001 });
      const playerA = new Player({ playerId: 'A', displayName: 'A' });
      const playerB = new Player({ playerId: 'B', displayName: 'B' });
      twoPlayerGame.addPlayer(playerA);
      twoPlayerGame.addPlayer(playerB);

      twoPlayerGame.start([
        [cardSpadesA],
        [cardSpades2, cardClubs10],
      ]);

      twoPlayerGame.playCard('B', cardSpades2);

      expect(twoPlayerGame.status).toBe(GameStatus.FINISHED);
      expect(twoPlayerGame.getKazhuthaPlayerId()).toBe('B');
      expect(twoPlayerGame.getFinishOrder()).toEqual(['A', 'B']);

      const snapshot = twoPlayerGame.toSnapshot();
      expect(snapshot.status).toBe(GameStatus.FINISHED);
      expect(snapshot.kazhuthaPlayerId).toBe('B');
      expect(snapshot.finishOrder).toEqual(['A', 'B']);
      expect(snapshot.nextRoundStarterId).toBeNull();
    });

    it('declares Kazhutha immediately when vett round eliminates the second-to-last active player', () => {
      const twoPlayerGame = new Game({ roomCode: 2002 });
      const playerA = new Player({ playerId: 'A', displayName: 'A' });
      const playerB = new Player({ playerId: 'B', displayName: 'B' });
      twoPlayerGame.addPlayer(playerA);
      twoPlayerGame.addPlayer(playerB);

      twoPlayerGame.start([
        [cardSpadesA],
        [cardClubs10], // player B has no spades, only 1 club
      ]);

      const vettPlay = twoPlayerGame.playCard('B', cardClubs10);

      expect(vettPlay.roundEnded).toBe(true);
      expect(vettPlay.isVett).toBe(true);
      expect(playerB.cardCount).toBe(0);
      expect(playerB.isSpectator()).toBe(true);
      expect(playerB.getFinishPosition()).toBe(1);

      // Player A took the pile, so player A has 2 cards and is the lone survivor (Kazhutha)
      expect(playerA.cardCount).toBe(2);
      expect(twoPlayerGame.status).toBe(GameStatus.FINISHED);
      expect(twoPlayerGame.getKazhuthaPlayerId()).toBe('A');
      expect(twoPlayerGame.getFinishOrder()).toEqual(['B', 'A']);

      const snapshot = twoPlayerGame.toSnapshot();
      expect(snapshot.status).toBe(GameStatus.FINISHED);
      expect(snapshot.kazhuthaPlayerId).toBe('A');
    });
  });

  describe('Priority Trick Starter Selection (User Story 3)', () => {
    it('selects second-highest led-suit card player as starter when trick winner empties hand', () => {
      const hands: Card[][] = [
        [cardSpadesA], // p1 has only A♠
        [cardSpadesK, cardHeartsK], // p2 plays K♠ (2nd highest)
        [cardSpadesQ, cardHeartsA], // p3 plays Q♠ (3rd highest)
      ];

      game.start(hands);
      // p2 plays K♠
      game.playCard('p2', cardSpadesK);
      // p3 plays Q♠
      const round1End = game.playCard('p3', cardSpadesQ);

      expect(round1End.roundEnded).toBe(true);
      expect(p1.cardCount).toBe(0);
      expect(p1.isSpectator()).toBe(true);

      // p1 was highest but finished; p2 played 2nd highest card and still has cards
      expect(round1End.nextStarterPlayerId).toBe('p2');
      expect(game.getNextRoundStarterId()).toBe('p2');
    });

    it('selects highest remaining card holder when multiple (N) players finish their hands', () => {
      const cardSpades10: Card = { suit: Suit.SPADES, rank: Rank.TEN };
      const cardSpades9: Card = { suit: Suit.SPADES, rank: Rank.NINE };

      const game4 = new Game({ roomCode: 4001 });
      const pl1 = new Player({ playerId: 'pl1', displayName: 'P1' });
      const pl2 = new Player({ playerId: 'pl2', displayName: 'P2' });
      const pl3 = new Player({ playerId: 'pl3', displayName: 'P3' });
      const pl4 = new Player({ playerId: 'pl4', displayName: 'P4' });
      game4.addPlayer(pl1);
      game4.addPlayer(pl2);
      game4.addPlayer(pl3);
      game4.addPlayer(pl4);

      game4.start([
        [cardSpadesA], // pl1 plays A♠, empties hand
        [cardSpadesK], // pl2 plays K♠, empties hand
        [cardSpades10, cardHeartsK], // pl3 plays 10♠, has 1 card left
        [cardSpades9, cardHeartsA], // pl4 plays 9♠, has 1 card left
      ]);

      game4.playCard('pl2', cardSpadesK);
      game4.playCard('pl3', cardSpades10);
      const res = game4.playCard('pl4', cardSpades9);

      expect(res.roundEnded).toBe(true);
      expect(pl1.isSpectator()).toBe(true);
      expect(pl2.isSpectator()).toBe(true);

      // Top 2 (A♠ and K♠) finished; among remaining players with cards (pl3 with 10♠ and pl4 with 9♠), pl3 played higher
      expect(res.nextStarterPlayerId).toBe('pl3');
      expect(game4.getNextRoundStarterId()).toBe('pl3');
    });
  });
});
