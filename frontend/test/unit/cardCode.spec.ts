import { describe, it, expect } from 'vitest';
import { toCardCode } from '../../src/utils/cardCode';
import type { Card, Suit, Rank } from '@shared/types';

describe('toCardCode', () => {
  it('maps Ace of Spades to As', () => {
    expect(toCardCode({ suit: 'SPADES', rank: 'A' })).toBe('As');
  });

  it('maps 10 of Hearts to Th', () => {
    expect(toCardCode({ suit: 'HEARTS', rank: '10' })).toBe('Th');
  });

  it('maps King of Diamonds to Kd', () => {
    expect(toCardCode({ suit: 'DIAMONDS', rank: 'K' })).toBe('Kd');
  });

  it('maps 2 of Clubs to 2c', () => {
    expect(toCardCode({ suit: 'CLUBS', rank: '2' })).toBe('2c');
  });

  it('generates non-empty 2-character code for all 52 card combinations', () => {
    const suits: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (const suit of suits) {
      for (const rank of ranks) {
        const code = toCardCode({ suit, rank });
        expect(code.length).toBe(2);
      }
    }
  });
});
