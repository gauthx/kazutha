import { describe, it, expect } from 'vitest';
import { Player } from '../../../src/game/domain/player.js';
import { Suit, Rank, ErrorCode } from '../../../src/game/constants.js';
import { GameError } from '../../../src/game/game.service.js';

describe('Player Domain Model', () => {
  const cardSpadesA = { suit: Suit.SPADES, rank: Rank.A };
  const cardHeartsK = { suit: Suit.HEARTS, rank: Rank.K };
  const cardClubs10 = { suit: Suit.CLUBS, rank: Rank.TEN };

  it('initializes with empty hand and default spectator state', () => {
    const player = new Player({ playerId: 'p1', displayName: 'Alice' });

    expect(player.playerId).toBe('p1');
    expect(player.displayName).toBe('Alice');
    expect(player.cardCount).toBe(0);
    expect(player.getHand()).toEqual([]);
    expect(player.isSpectator()).toBe(false);
    expect(player.getFinishPosition()).toBeNull();
  });

  it('manages hand correctly and checks hasCard and hasSuit', () => {
    const player = new Player({
      playerId: 'p1',
      displayName: 'Alice',
      initialHand: [cardSpadesA, cardHeartsK],
    });

    expect(player.cardCount).toBe(2);
    expect(player.hasCard(cardSpadesA)).toBe(true);
    expect(player.hasCard(cardClubs10)).toBe(false);
    expect(player.hasSuit(Suit.SPADES)).toBe(true);
    expect(player.hasSuit(Suit.CLUBS)).toBe(false);

    player.addCard(cardClubs10);
    expect(player.cardCount).toBe(3);
    expect(player.hasSuit(Suit.CLUBS)).toBe(true);

    player.removeCard(cardSpadesA);
    expect(player.cardCount).toBe(2);
    expect(player.hasCard(cardSpadesA)).toBe(false);
  });

  it('prevents direct mutation of internal hand array via getHand', () => {
    const player = new Player({
      playerId: 'p1',
      displayName: 'Alice',
      initialHand: [cardSpadesA],
    });

    const handCopy = player.getHand() as any[];
    handCopy.push(cardHeartsK);

    expect(player.cardCount).toBe(1);
    expect(player.hasCard(cardHeartsK)).toBe(false);
  });

  it('throws CARD_NOT_IN_HAND when attempting to remove card not owned', () => {
    const player = new Player({
      playerId: 'p1',
      displayName: 'Alice',
      initialHand: [cardSpadesA],
    });

    expect(() => player.removeCard(cardHeartsK)).toThrow(GameError);
    try {
      player.removeCard(cardHeartsK);
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.CARD_NOT_IN_HAND);
    }
  });

  it('tracks finishing position and spectator status', () => {
    const player = new Player({ playerId: 'p1', displayName: 'Alice' });

    expect(player.isSpectator()).toBe(false);
    player.markFinished(1);
    expect(player.isSpectator()).toBe(true);
    expect(player.getFinishPosition()).toBe(1);
  });

  it('serializes to public object including spectator state', () => {
    const player = new Player({ playerId: 'p1', displayName: 'Alice' });
    expect(player.toPublic()).toEqual({
      playerId: 'p1',
      displayName: 'Alice',
      cardCount: 0,
      isConnected: true,
      isSpectator: false,
      finishPosition: null,
    });

    player.markFinished(2);
    expect(player.toPublic()).toEqual({
      playerId: 'p1',
      displayName: 'Alice',
      cardCount: 0,
      isConnected: true,
      isSpectator: true,
      finishPosition: 2,
    });
  });
});
