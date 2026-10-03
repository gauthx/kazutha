import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GameStoreService } from '../game/game-store.service.js';
import { generateRoomCode } from '../utils/room-code.js';
import { GameError } from '../game/game.service.js';
import { ErrorCode } from '../game/constants.js';
import { Player } from '../game/domain/player.js';
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
    const game = this.store.createRoom(roomCode, playerId);

    game.addPlayer(
      new Player({
        playerId,
        displayName: validName,
      }),
    );

    return { roomCode, playerId, snapshot: game.toSnapshot() };
  }

  joinRoom(roomCode: number, displayName: string, customPlayerId?: string) {
    const validName = this.validateDisplayName(displayName);
    const game = this.store.getRoom(roomCode);
    if (!game) {
      throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
    }

    const playerId = customPlayerId || randomUUID();
    game.addPlayer(
      new Player({
        playerId,
        displayName: validName,
      }),
    );

    return { roomCode, playerId, snapshot: game.toSnapshot() };
  }

  removePlayer(roomCode: number, playerId: string) {
    const isRoomEmpty = this.store.removePlayer(roomCode, playerId);
    if (isRoomEmpty) return { isRoomEmpty: true };
    const game = this.store.getRoom(roomCode);
    return {
      isRoomEmpty: false,
      snapshot: game ? game.toSnapshot() : undefined,
    };
  }

  getRoomSnapshot(roomCode: number): RoomSnapshot | null {
    const game = this.store.getRoom(roomCode);
    return game ? game.toSnapshot() : null;
  }
}
