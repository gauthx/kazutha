import type { Card, Rank, Suit, RoundSnapshot, PlayedCardPublic } from '@shared/types';
import { Rank as RankConst } from '../constants.js';

export interface PlayedCard {
  playerId: string;
  card: Card;
  turnIndex: number;
}

const RANK_ORDER: Rank[] = [
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
  RankConst.A,
];

export function compareRank(a: Rank, b: Rank): number {
  return RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b);
}

export class Round {
  readonly roundNumber: number;
  readonly starterPlayerId: string;
  readonly ledSuit: Suit;
  readonly turnOrder: readonly string[];

  private currentTurnIndex: number = 0;
  private readonly playedCards: PlayedCard[] = [];

  constructor(params: {
    roundNumber: number;
    starterPlayerId: string;
    ledSuit: Suit;
    turnOrder: string[];
    initialPlay?: { playerId: string; card: Card };
  }) {
    this.roundNumber = params.roundNumber;
    this.starterPlayerId = params.starterPlayerId;
    this.ledSuit = params.ledSuit;
    this.turnOrder = [...params.turnOrder];

    if (params.initialPlay) {
      this.playedCards.push({
        playerId: params.initialPlay.playerId,
        card: params.initialPlay.card,
        turnIndex: 0,
      });
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    }
  }

  get currentTurnPlayerId(): string {
    return this.turnOrder[this.currentTurnIndex] ?? '';
  }

  getPlayedCards(): readonly PlayedCard[] {
    return [...this.playedCards];
  }

  addPlayedCard(playerId: string, card: Card): void {
    this.playedCards.push({
      playerId,
      card,
      turnIndex: this.playedCards.length,
    });
  }

  advanceTurn(): void {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
  }

  isComplete(): boolean {
    return this.playedCards.length === this.turnOrder.length;
  }

  getHighestLedSuitPlay(): PlayedCard {
    const ledPlays = this.playedCards.filter((pc) => pc.card.suit === this.ledSuit);
    if (ledPlays.length === 0) {
      throw new Error('No cards of the led suit were played in this round');
    }

    return ledPlays.reduce((highest, play) =>
      compareRank(play.card.rank, highest.card.rank) > 0 ? play : highest,
    );
  }

  toSnapshot(): RoundSnapshot {
    return {
      roundNumber: this.roundNumber,
      ledSuit: this.ledSuit,
      currentTurnPlayerId: this.currentTurnPlayerId,
      playedCards: this.playedCards.map((pc): PlayedCardPublic => ({
        playerId: pc.playerId,
        card: pc.card,
      })),
    };
  }
}
