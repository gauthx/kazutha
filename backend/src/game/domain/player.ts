import type { Card, Suit, PlayerPublic } from '@shared/types';
import { GameError } from '../errors.js';
import { ErrorCode } from '../constants.js';

export class Player {
  readonly playerId: string;
  readonly displayName: string;
  socketId: string;
  isConnected: boolean;
  lastSeen: number;

  private readonly hand: Card[] = [];
  private finishPosition: number | null = null;

  constructor(params: {
    playerId: string;
    displayName: string;
    socketId?: string;
    isConnected?: boolean;
    lastSeen?: number;
    initialHand?: Card[];
  }) {
    this.playerId = params.playerId;
    this.displayName = params.displayName;
    this.socketId = params.socketId ?? '';
    this.isConnected = params.isConnected ?? true;
    this.lastSeen = params.lastSeen ?? Date.now();
    if (params.initialHand && params.initialHand.length > 0) {
      this.hand.push(...params.initialHand);
    }
  }

  getHand(): readonly Card[] {
    return [...this.hand];
  }

  get cardCount(): number {
    return this.hand.length;
  }

  hasCard(card: Card): boolean {
    return this.hand.some((c) => c.suit === card.suit && c.rank === card.rank);
  }

  hasSuit(suit: Suit): boolean {
    return this.hand.some((c) => c.suit === suit);
  }

  addCard(card: Card): void {
    this.hand.push(card);
  }

  addCards(cards: Card[]): void {
    this.hand.push(...cards);
  }

  removeCard(card: Card): void {
    const index = this.hand.findIndex(
      (c) => c.suit === card.suit && c.rank === card.rank,
    );
    if (index === -1) {
      throw new GameError(ErrorCode.CARD_NOT_IN_HAND, 'Card not in hand');
    }
    this.hand.splice(index, 1);
  }

  setHand(cards: Card[]): void {
    this.hand.length = 0;
    this.hand.push(...cards);
  }

  markFinished(position: number): void {
    this.finishPosition = position;
  }

  getFinishPosition(): number | null {
    return this.finishPosition;
  }

  isSpectator(): boolean {
    return this.finishPosition !== null;
  }

  toPublic(): PlayerPublic {
    return {
      playerId: this.playerId,
      displayName: this.displayName,
      cardCount: this.cardCount,
      isConnected: this.isConnected,
      isSpectator: this.isSpectator(),
      finishPosition: this.finishPosition,
    };
  }
}
