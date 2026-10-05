import { Injectable } from '@nestjs/common';
import type { Card, Suit, Rank } from '@shared/types';
import { Suit as SuitConst, Rank as RankConst } from './constants.js';

export const SUITS: Suit[] = [
  SuitConst.SPADES,
  SuitConst.HEARTS,
  SuitConst.DIAMONDS,
  SuitConst.CLUBS,
];

export const RANKS: Rank[] = [
  RankConst.A,
  RankConst.TWO,
  RankConst.THREE,
  RankConst.FOUR,
  RankConst.FIVE,
  RankConst.SIX,
  RankConst.SEVEN,
  RankConst.EIGHT,
  RankConst.NINE,
  RankConst.TEN,
  RankConst.J,
  RankConst.Q,
  RankConst.K,
];

@Injectable()
export class DeckService {
  createDeck(): Card[] {
    return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
  }

  shuffleDeck<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  dealCards(deck: Card[], numPlayers: number): Card[][] {
    if (numPlayers < 1) {
      throw new Error('numPlayers must be at least 1');
    }
    return deck.reduce<Card[][]>(
      (hands, card, i) => {
        hands[i % numPlayers].push(card);
        return hands;
      },
      Array.from({ length: numPlayers }, () => []),
    );
  }
}
