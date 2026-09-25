import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameStoreService } from '../../src/game/game-store.service.js';

describe('GameStoreService', () => {
  let service: GameStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameStoreService],
    }).compile();

    service = module.get<GameStoreService>(GameStoreService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('creates, retrieves, and checks existence of a room', () => {
    const room = service.createRoom(1000, 'host-1');
    expect(room.roomCode).toBe(1000);
    expect(room.status).toBe('WAITING');
    expect(room.hostPlayerId).toBe('host-1');

    expect(service.hasRoom(1000)).toBe(true);
    expect(service.hasRoom(9999)).toBe(false);

    const retrieved = service.getRoom(1000);
    expect(retrieved).toBeDefined();
    expect(retrieved?.roomCode).toBe(1000);
  });

  it('deletes a room', () => {
    service.createRoom(1000, 'host-1');
    expect(service.hasRoom(1000)).toBe(true);

    service.deleteRoom(1000);
    expect(service.hasRoom(1000)).toBe(false);
  });

  it('removes player and reassigns host if host left', () => {
    const room = service.createRoom(1000, 'host-1');
    room.players.set('host-1', {
      playerId: 'host-1',
      displayName: 'Alice',
      socketId: 'sock-1',
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });
    room.players.set('guest-2', {
      playerId: 'guest-2',
      displayName: 'Bob',
      socketId: 'sock-2',
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    const isRoomEmpty = service.removePlayer(1000, 'host-1');
    expect(isRoomEmpty).toBe(false);
    expect(room.players.has('host-1')).toBe(false);
    expect(room.hostPlayerId).toBe('guest-2');
  });

  it('deletes room when last player is removed', () => {
    const room = service.createRoom(1000, 'host-1');
    room.players.set('host-1', {
      playerId: 'host-1',
      displayName: 'Alice',
      socketId: 'sock-1',
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    const isRoomEmpty = service.removePlayer(1000, 'host-1');
    expect(isRoomEmpty).toBe(true);
    expect(service.hasRoom(1000)).toBe(false);
  });

  it('finds player by socket id', () => {
    const room = service.createRoom(1000, 'host-1');
    room.players.set('player-1', {
      playerId: 'player-1',
      displayName: 'Alice',
      socketId: 'sock-123',
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    const result = service.findPlayerBySocketId('sock-123');
    expect(result).toBeDefined();
    expect(result?.player.displayName).toBe('Alice');
    expect(result?.room.roomCode).toBe(1000);

    expect(service.findPlayerBySocketId('nonexistent')).toBeUndefined();
  });

  it('converts room to safe RoomSnapshot without exposing private hands', () => {
    const room = service.createRoom(1000, 'host-1');
    room.players.set('player-1', {
      playerId: 'player-1',
      displayName: 'Alice',
      socketId: 'sock-1',
      hand: [{ suit: 'SPADES', rank: 'A' }],
      isConnected: true,
      lastSeen: Date.now(),
    });

    const snapshot = service.toRoomSnapshot(room);
    expect(snapshot.roomCode).toBe(1000);
    expect(snapshot.hostPlayerId).toBe('host-1');
    expect(snapshot.players.length).toBe(1);
    expect(snapshot.players[0].cardCount).toBe(1);
    expect((snapshot.players[0] as any).hand).toBeUndefined();
  });
});
