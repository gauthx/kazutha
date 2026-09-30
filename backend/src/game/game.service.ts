import { Injectable } from '@nestjs/common';
import { GameStoreService } from './game-store.service.js';
import { DeckService } from './deck.service.js';
import type { Card } from '@shared/types';

export class GameError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export interface PlayerHandAssignment {
  playerId: string;
  socketId: string;
  hand: Card[];
}

@Injectable()
export class GameService {
  constructor(
    private readonly store: GameStoreService,
    private readonly deckService: DeckService,
  ) {}

  startGame(roomCode: number, requesterPlayerId: string) {
    const room = this.store.getRoom(roomCode);
    if (!room) {
      throw new GameError('ROOM_NOT_FOUND', 'Room not found');
    }

    if (room.hostPlayerId !== requesterPlayerId) {
      throw new GameError('NOT_HOST', 'Only the host can start the game');
    }

    if (room.players.size < 2) {
      throw new GameError(
        'NOT_ENOUGH_PLAYERS',
        'At least 2 players are required to start',
      );
    }

    if (room.status !== 'WAITING') {
      throw new GameError(
        'GAME_IN_PROGRESS',
        'Game is already in progress',
      );
    }

    room.status = 'IN_PROGRESS';
    const deck = this.deckService.shuffleDeck(this.deckService.createDeck());
    const hands = this.deckService.dealCards(deck, room.players.size);

    const playerAssignments: PlayerHandAssignment[] = [];
    let index = 0;
    for (const player of room.players.values()) {
      player.hand = hands[index] || [];
      playerAssignments.push({
        playerId: player.playerId,
        socketId: player.socketId,
        hand: player.hand,
      });
      index++;
    }

    return {
      snapshot: this.store.toRoomSnapshot(room),
      playerAssignments,
    };
  }

  connectPlayer(roomCode: number, playerId: string, socketId: string) {
    const room = this.store.getRoom(roomCode);
    if (!room) {
      return null;
    }

    const player = room.players.get(playerId);
    if (!player) {
      return null;
    }

    player.socketId = socketId;
    player.isConnected = true;
    player.lastSeen = Date.now();

    return {
      player,
      snapshot: this.store.toRoomSnapshot(room),
    };
  }

  disconnectPlayer(socketId: string) {
    const found = this.store.findPlayerBySocketId(socketId);
    if (!found) {
      return null;
    }

    const { room, player } = found;
    player.isConnected = false;
    player.lastSeen = Date.now();

    return {
      roomCode: room.roomCode,
      player,
      snapshot: this.store.toRoomSnapshot(room),
    };
  }

  removePlayer(roomCode: number, playerId: string) {
    const isRoomEmpty = this.store.removePlayer(roomCode, playerId);
    if (isRoomEmpty) {
      return { isRoomEmpty: true };
    }

    const room = this.store.getRoom(roomCode);
    return {
      isRoomEmpty: false,
      snapshot: room ? this.store.toRoomSnapshot(room) : undefined,
    };
  }
}
