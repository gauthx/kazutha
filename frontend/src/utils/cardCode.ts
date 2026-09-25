import type { Card, Suit } from '@shared/types';

const SUIT_MAP: Record<Suit, string> = {
  SPADES: 's',
  HEARTS: 'h',
  DIAMONDS: 'd',
  CLUBS: 'c',
};

/**
 * Maps a Card entity to react-playing-cards two-character code format:
 * e.g., { suit: 'SPADES', rank: 'A' } -> "As"
 *       { suit: 'HEARTS', rank: '10' } -> "Th"
 */
export function toCardCode(card: Card): string {
  const rank = card.rank === '10' ? 'T' : card.rank;
  const suit = SUIT_MAP[card.suit];
  return `${rank}${suit}`;
}
