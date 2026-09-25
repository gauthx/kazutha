import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { Card, GameStatus, RoomSnapshot, PlayerPublic } from '@shared/types';

export interface PlayerInternal {
  playerId: string;
  displayName: string;
  socketId: string;
  hand: Card[];
  isConnected: boolean;
  lastSeen: number;
}

export interface GameRoom {
  roomCode: number;
  status: GameStatus;
  players: Map<string, PlayerInternal>;
  hostPlayerId: string;
  deck: Card[];
  createdAt: number;
  lastActivityAt: number;
}

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class GameStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(GameStoreService.name);
  private readonly rooms = new Map<number, GameRoom>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.evictStaleRooms(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  createRoom(roomCode: number, hostPlayerId = ''): GameRoom {
    const now = Date.now();
    const room: GameRoom = {
      roomCode,
      status: 'WAITING',
      players: new Map(),
      hostPlayerId,
      deck: [],
      createdAt: now,
      lastActivityAt: now,
    };
    this.rooms.set(roomCode, room);
    return room;
  }

  getRoom(roomCode: number): GameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  hasRoom(roomCode: number): boolean {
    return this.rooms.has(roomCode);
  }

  removePlayer(roomCode: number, playerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return true;
    }

    room.players.delete(playerId);
    const isRoomEmpty = room.players.size === 0;

    if (isRoomEmpty) {
      this.deleteRoom(roomCode);
      return true;
    }

    const wasHost = room.hostPlayerId === playerId;
    if (wasHost) {
      const nextPlayer = room.players.values().next().value;
      if (nextPlayer) {
        room.hostPlayerId = nextPlayer.playerId;
      }
    }

    return false;
  }

  findPlayerBySocketId(socketId: string): { room: GameRoom; player: PlayerInternal } | undefined {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          return { room, player };
        }
      }
    }
    return undefined;
  }

  updateActivity(roomCode: number): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.lastActivityAt = Date.now();
    }
  }

  deleteRoom(roomCode: number): void {
    this.rooms.delete(roomCode);
    this.logger.log(`Room ${roomCode} deleted`);
  }

  toRoomSnapshot(room: GameRoom): RoomSnapshot {
    const players: PlayerPublic[] = Array.from(room.players.values()).map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      cardCount: p.hand.length,
      isConnected: p.isConnected,
    }));

    return {
      roomCode: room.roomCode,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      players,
    };
  }

  private evictStaleRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > ROOM_TTL_MS) {
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
