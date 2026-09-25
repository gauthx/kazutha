import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DeckService } from '../../src/game/deck.service.js';

describe('DeckService', () => {
  let service: DeckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeckService],
    }).compile();

    service = module.get<DeckService>(DeckService);
  });

  it('creates 52 cards', () => {
    const deck = service.createDeck();
    expect(deck.length).toBe(52);
    const cardSet = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
    expect(cardSet.size).toBe(52);
  });

  it('shuffles deck', () => {
    const deck = service.createDeck();
    const shuffled = service.shuffleDeck(deck);
    expect(shuffled.length).toBe(52);
  });

  it('deals cards evenly to 4 players', () => {
    const deck = service.createDeck();
    const hands = service.dealCards(deck, 4);
    expect(hands.length).toBe(4);
    hands.forEach((hand) => expect(hand.length).toBe(13));
  });

  it('deals remainder cards to first players when uneven', () => {
    const deck = service.createDeck();
    const hands = service.dealCards(deck, 3);
    expect(hands[0].length).toBe(18);
    expect(hands[1].length).toBe(17);
    expect(hands[2].length).toBe(17);
  });

  it('throws error when numPlayers is less than 1', () => {
    const deck = service.createDeck();
    expect(() => service.dealCards(deck, 0)).toThrow('numPlayers must be at least 1');
  });
});
