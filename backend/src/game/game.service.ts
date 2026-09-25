import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GameStoreService, PlayerInternal } from './game-store.service.js';
import { DeckService } from './deck.service.js';
import { generateRoomCode } from '../utils/room-code.js';
import type { Card, RoomSnapshot } from '@shared/types';

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

  private validateDisplayName(displayName?: string): string {
    const trimmed = displayName?.trim();
    if (!trimmed || trimmed.length > 24) {
      throw new GameError(
        'INVALID_DISPLAY_NAME',
        'Display name must be between 1 and 24 characters',
      );
    }
    return trimmed;
  }

  createRoom(displayName: string, socketId: string, customPlayerId?: string) {
    const validName = this.validateDisplayName(displayName);
    const roomCode = generateRoomCode();
    const playerId = customPlayerId || randomUUID();
    const room = this.store.createRoom(roomCode, playerId);

    room.players.set(playerId, {
      playerId,
      displayName: validName,
      socketId,
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    return {
      roomCode,
      playerId,
      snapshot: this.store.toRoomSnapshot(room),
    };
  }

  joinRoom(
    roomCode: number,
    displayName: string,
    socketId: string,
    customPlayerId?: string,
  ) {
    const validName = this.validateDisplayName(displayName);
    const room = this.store.getRoom(roomCode);

    if (!room) {
      throw new GameError('ROOM_NOT_FOUND', 'Room not found');
    }

    if (room.status !== 'WAITING') {
      throw new GameError(
        'GAME_IN_PROGRESS',
        'Game is already in progress',
      );
    }

    if (room.players.size >= 6) {
      throw new GameError('ROOM_FULL', 'Room is full (max 6 players)');
    }

    const playerId = customPlayerId || randomUUID();
    room.players.set(playerId, {
      playerId,
      displayName: validName,
      socketId,
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    return {
      roomCode,
      playerId,
      snapshot: this.store.toRoomSnapshot(room),
    };
  }

  reconnectPlayer(roomCode: number, playerId: string, socketId: string) {
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

  getRoomSnapshot(roomCode: number): RoomSnapshot | null {
    const room = this.store.getRoom(roomCode);
    return room ? this.store.toRoomSnapshot(room) : null;
  }
}
