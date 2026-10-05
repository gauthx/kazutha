import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { RoomSnapshot } from '@shared/types';
import { Game } from './domain/game.js';
import { Player } from './domain/player.js';

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class GameStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(GameStoreService.name);
  private readonly rooms = new Map<number, Game>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.evictStaleRooms(),
      CLEANUP_INTERVAL_MS,
    );
    this.cleanupTimer.unref?.();
  }

  createRoom(roomCode: number, hostPlayerId = ''): Game {
    const game = new Game({
      roomCode,
      hostPlayerId,
    });
    this.rooms.set(roomCode, game);
    return game;
  }

  getRoom(roomCode: number): Game | undefined {
    return this.rooms.get(roomCode);
  }

  hasRoom(roomCode: number): boolean {
    return this.rooms.has(roomCode);
  }

  removePlayer(roomCode: number, playerId: string): boolean {
    const game = this.rooms.get(roomCode);
    if (!game) return true;
    const { isRoomEmpty } = game.removePlayer(playerId);
    if (isRoomEmpty) {
      this.deleteRoom(roomCode);
      return true;
    }
    return false;
  }

  findPlayerBySocketId(
    socketId: string,
  ): { room: Game; player: Player } | undefined {
    for (const game of this.rooms.values()) {
      const player = game.getPlayers().find((p) => p.socketId === socketId);
      if (player) return { room: game, player };
    }
    return undefined;
  }

  updateActivity(roomCode: number): void {
    const game = this.rooms.get(roomCode);
    if (game) {
      game.lastActivityAt = Date.now();
    }
  }

  deleteRoom(roomCode: number): void {
    this.rooms.delete(roomCode);
    this.logger.log(`Room ${roomCode} deleted`);
  }

  toRoomSnapshot(game: Game): RoomSnapshot {
    return game.toSnapshot();
  }

  private evictStaleRooms(): void {
    const now = Date.now();
    for (const [code, game] of this.rooms) {
      if (now - game.lastActivityAt > ROOM_TTL_MS) {
        this.rooms.delete(code);
        this.logger.log(`Evicted inactive room ${code}`);
      }
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
    this.rooms.clear();
  }
}
