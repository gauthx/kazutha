import { describe, it, expect } from 'vitest';
import { Round, compareRank } from '../../../src/game/domain/round.js';
import { Suit, Rank } from '../../../src/game/constants.js';

describe('Round Domain Model', () => {
  const cardSpadesA = { suit: Suit.SPADES, rank: Rank.A };
  const cardSpadesK = { suit: Suit.SPADES, rank: Rank.K };
  const cardSpades2 = { suit: Suit.SPADES, rank: Rank.TWO };
  const cardHeartsA = { suit: Suit.HEARTS, rank: Rank.A };

  describe('compareRank', () => {
    it('orders ranks A > K > Q > J > 10 > ... > 2', () => {
      expect(compareRank(Rank.A, Rank.K)).toBeGreaterThan(0);
      expect(compareRank(Rank.K, Rank.Q)).toBeGreaterThan(0);
      expect(compareRank(Rank.TEN, Rank.NINE)).toBeGreaterThan(0);
      expect(compareRank(Rank.TWO, Rank.A)).toBeLessThan(0);
      expect(compareRank(Rank.J, Rank.J)).toBe(0);
    });
  });

  describe('Round lifecycle', () => {
    it('initializes round with starter, led suit, and optional initial play', () => {
      const round = new Round({
        roundNumber: 1,
        starterPlayerId: 'p1',
        ledSuit: Suit.SPADES,
        turnOrder: ['p1', 'p2', 'p3'],
        initialPlay: { playerId: 'p1', card: cardSpadesA },
      });

      expect(round.roundNumber).toBe(1);
      expect(round.starterPlayerId).toBe('p1');
      expect(round.ledSuit).toBe(Suit.SPADES);
      expect(round.currentTurnPlayerId).toBe('p2');
      expect(round.getPlayedCards()).toHaveLength(1);
      expect(round.getPlayedCards()[0]).toEqual({
        playerId: 'p1',
        card: cardSpadesA,
        turnIndex: 0,
      });
      expect(round.isComplete()).toBe(false);
    });

    it('advances turns and detects completion', () => {
      const round = new Round({
        roundNumber: 1,
        starterPlayerId: 'p1',
        ledSuit: Suit.SPADES,
        turnOrder: ['p1', 'p2', 'p3'],
        initialPlay: { playerId: 'p1', card: cardSpadesA },
      });

      round.addPlayedCard('p2', cardSpadesK);
      round.advanceTurn();
      expect(round.currentTurnPlayerId).toBe('p3');
      expect(round.isComplete()).toBe(false);

      round.addPlayedCard('p3', cardSpades2);
      expect(round.isComplete()).toBe(true);
    });

    it('identifies highest card of led suit ignoring off-suit cards', () => {
      const round = new Round({
        roundNumber: 1,
        starterPlayerId: 'p1',
        ledSuit: Suit.SPADES,
        turnOrder: ['p1', 'p2', 'p3'],
        initialPlay: { playerId: 'p1', card: cardSpades2 },
      });

      round.addPlayedCard('p2', cardSpadesK);
      round.addPlayedCard('p3', cardHeartsA); // Off-suit A should not beat K of spades

      const highest = round.getHighestLedSuitPlay();
      expect(highest.playerId).toBe('p2');
      expect(highest.card).toEqual(cardSpadesK);
    });
  });
});
