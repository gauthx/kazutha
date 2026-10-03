import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameStoreService } from '../../src/game/game-store.service.js';
import { Player } from '../../src/game/domain/player.js';
import { Suit, Rank } from '../../src/game/constants.js';

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
    room.addPlayer(
      new Player({
        playerId: 'host-1',
        displayName: 'Alice',
        socketId: 'sock-1',
      }),
    );
    room.addPlayer(
      new Player({
        playerId: 'guest-2',
        displayName: 'Bob',
        socketId: 'sock-2',
      }),
    );

    const isRoomEmpty = service.removePlayer(1000, 'host-1');
    expect(isRoomEmpty).toBe(false);
    expect(room.getPlayer('host-1')).toBeUndefined();
    expect(room.hostPlayerId).toBe('guest-2');
  });

  it('deletes room when last player is removed', () => {
    const room = service.createRoom(1000, 'host-1');
    room.addPlayer(
      new Player({
        playerId: 'host-1',
        displayName: 'Alice',
        socketId: 'sock-1',
      }),
    );

    const isRoomEmpty = service.removePlayer(1000, 'host-1');
    expect(isRoomEmpty).toBe(true);
    expect(service.hasRoom(1000)).toBe(false);
  });

  it('finds player by socket id', () => {
    const room = service.createRoom(1000, 'host-1');
    room.addPlayer(
      new Player({
        playerId: 'player-1',
        displayName: 'Alice',
        socketId: 'sock-123',
      }),
    );

    const result = service.findPlayerBySocketId('sock-123');
    expect(result).toBeDefined();
    expect(result?.player.displayName).toBe('Alice');
    expect(result?.room.roomCode).toBe(1000);

    expect(service.findPlayerBySocketId('nonexistent')).toBeUndefined();
  });

  it('converts room to safe RoomSnapshot without exposing private hands', () => {
    const room = service.createRoom(1000, 'host-1');
    room.addPlayer(
      new Player({
        playerId: 'player-1',
        displayName: 'Alice',
        socketId: 'sock-1',
        initialHand: [{ suit: Suit.SPADES, rank: Rank.A }],
      }),
    );

    const snapshot = service.toRoomSnapshot(room);
    expect(snapshot.roomCode).toBe(1000);
    expect(snapshot.hostPlayerId).toBe('host-1');
    expect(snapshot.players.length).toBe(1);
    expect(snapshot.players[0].cardCount).toBe(1);
    expect((snapshot.players[0] as any).hand).toBeUndefined();
  });
});
