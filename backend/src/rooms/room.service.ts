import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GameStoreService } from '../game/game-store.service.js';
import { generateRoomCode } from '../utils/room-code.js';
import { GameError } from '../game/game.service.js';
import { ErrorCode } from './rooms.controller.js';
import type { RoomSnapshot } from '@shared/types';

@Injectable()
export class RoomService {
  constructor(private readonly store: GameStoreService) {}

  validateDisplayName(displayName?: string): string {
    const trimmed = displayName?.trim();
    if (!trimmed || trimmed.length > 24) {
      throw new GameError(
        ErrorCode.INVALID_DISPLAY_NAME,
        'Display name must be between 1 and 24 characters',
      );
    }
    return trimmed;
  }

  createRoom(displayName: string, customPlayerId?: string) {
    const validName = this.validateDisplayName(displayName);
    const roomCode = generateRoomCode();
    const playerId = customPlayerId || randomUUID();
    const room = this.store.createRoom(roomCode, playerId);

    room.players.set(playerId, {
      playerId,
      displayName: validName,
      socketId: '',
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
    customPlayerId?: string,
  ) {
    const validName = this.validateDisplayName(displayName);
    const room = this.store.getRoom(roomCode);

    if (!room) {
      throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
    }

    if (room.status !== 'WAITING') {
      throw new GameError(
        ErrorCode.GAME_IN_PROGRESS,
        'Game is already in progress',
      );
    }

    if (room.players.size >= 6) {
      throw new GameError(ErrorCode.ROOM_FULL, 'Room is full (max 6 players)');
    }

    const playerId = customPlayerId || randomUUID();
    room.players.set(playerId, {
      playerId,
      displayName: validName,
      socketId: '',
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

  getRoomSnapshot(roomCode: number): RoomSnapshot | null {
    const room = this.store.getRoom(roomCode);
    return room ? this.store.toRoomSnapshot(room) : null;
  }
}
