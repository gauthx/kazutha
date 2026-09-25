import { Injectable } from '@nestjs/common';
import type { Card, Suit, Rank } from '@shared/types';

export const SUITS: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

@Injectable()
export class DeckService {
  createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
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
    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
    for (let i = 0; i < deck.length; i++) {
      hands[i % numPlayers].push(deck[i]);
    }
    return hands;
  }
}
