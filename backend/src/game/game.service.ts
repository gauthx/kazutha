import { Injectable } from '@nestjs/common';
import { GameStoreService } from './game-store.service.js';
import { DeckService } from './deck.service.js';
import type { Card } from '@shared/types';
import { ErrorCode } from './constants.js';
import { GameError } from './errors.js';
import type { PlayCardResult, PlayerHandAssignment } from './domain/game.js';

export { GameError };
export type { PlayerHandAssignment };

@Injectable()
export class GameService {
  constructor(
    private readonly store: GameStoreService,
    private readonly deckService: DeckService,
  ) {}

  startGame(roomCode: number, requesterPlayerId: string) {
    const game = this.store.getRoom(roomCode);
    if (!game) {
      throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
    }
    if (game.hostPlayerId !== requesterPlayerId) {
      throw new GameError(ErrorCode.NOT_HOST, 'Only the host can start the game');
    }

    const deck = this.deckService.shuffleDeck(this.deckService.createDeck());
    const hands = this.deckService.dealCards(deck, game.playerCount);

    const result = game.start(hands);

    return {
      snapshot: game.toSnapshot(),
      playerAssignments: result.playerAssignments,
      autoPlayedCard: result.autoPlayedCard,
    };
  }

  connectPlayer(roomCode: number, playerId: string, socketId: string) {
    const game = this.store.getRoom(roomCode);
    if (!game) return null;

    const player = game.getPlayer(playerId);
    if (!player) return null;

    player.socketId = socketId;
    player.isConnected = true;
    player.lastSeen = Date.now();

    return {
      player,
      snapshot: game.toSnapshot(),
    };
  }

  disconnectPlayer(socketId: string) {
    const found = this.store.findPlayerBySocketId(socketId);
    if (!found) return null;

    const { room: game, player } = found;
    player.isConnected = false;
    player.lastSeen = Date.now();

    return {
      roomCode: game.roomCode,
      player,
      snapshot: game.toSnapshot(),
    };
  }

  removePlayer(roomCode: number, playerId: string) {
    const isRoomEmpty = this.store.removePlayer(roomCode, playerId);
    if (isRoomEmpty) {
      return { isRoomEmpty: true };
    }

    const game = this.store.getRoom(roomCode);
    return {
      isRoomEmpty: false,
      snapshot: game ? game.toSnapshot() : undefined,
    };
  }

  playCard(roomCode: number, playerId: string, card: Card): PlayCardResult {
    const game = this.store.getRoom(roomCode);
    if (!game) {
      throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
    }

    return game.playCard(playerId, card);
  }
}
