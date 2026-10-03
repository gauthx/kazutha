import { describe, it, expect, beforeEach } from 'vitest';
import { RoomService } from '../../src/rooms/room.service.js';
import { GameStoreService } from '../../src/game/game-store.service.js';
import { GameError } from '../../src/game/game.service.js';
import { ErrorCode, GameStatus } from '../../src/game/constants.js';

describe('RoomService', () => {
  let roomService: RoomService;
  let store: GameStoreService;

  beforeEach(() => {
    store = new GameStoreService();
    roomService = new RoomService(store);
  });

  describe('createRoom', () => {
    it('creates a room with a valid host and returns snapshot', () => {
      const result = roomService.createRoom('Alice');

      expect(result.roomCode).toBeGreaterThanOrEqual(1000);
      expect(result.roomCode).toBeLessThanOrEqual(9999);
      expect(result.playerId).toBeDefined();
      expect(result.snapshot.hostPlayerId).toBe(result.playerId);
      expect(result.snapshot.status).toBe(GameStatus.WAITING);
      expect(result.snapshot.players).toHaveLength(1);
      expect(result.snapshot.players[0].displayName).toBe('Alice');
    });

    it('rejects empty or whitespace-only display name', () => {
      expect(() => roomService.createRoom('')).toThrow(GameError);
      expect(() => roomService.createRoom('   ')).toThrow(GameError);
    });

    it('rejects display name longer than 24 characters', () => {
      expect(() => roomService.createRoom('a'.repeat(25))).toThrow(GameError);
    });
  });

  describe('joinRoom', () => {
    it('allows player to join an existing waiting room', () => {
      const created = roomService.createRoom('Alice');
      const joined = roomService.joinRoom(created.roomCode, 'Bob');

      expect(joined.roomCode).toBe(created.roomCode);
      expect(joined.playerId).toBeDefined();
      expect(joined.snapshot.players).toHaveLength(2);
      expect(joined.snapshot.players[1].displayName).toBe('Bob');
    });

    it('throws ROOM_NOT_FOUND for non-existent room', () => {
      expect(() => roomService.joinRoom(9999, 'Bob')).toThrow(GameError);
      try {
        roomService.joinRoom(9999, 'Bob');
      } catch (err: any) {
        expect(err.code).toBe(ErrorCode.ROOM_NOT_FOUND);
      }
    });

    it('throws ROOM_FULL when room reaches 6 players', () => {
      const created = roomService.createRoom('Player1');
      for (let i = 2; i <= 6; i++) {
        roomService.joinRoom(created.roomCode, `Player${i}`);
      }

      expect(() => roomService.joinRoom(created.roomCode, 'Player7')).toThrow(
        GameError,
      );
      try {
        roomService.joinRoom(created.roomCode, 'Player7');
      } catch (err: any) {
        expect(err.code).toBe(ErrorCode.ROOM_FULL);
      }
    });
  });

  describe('removePlayer', () => {
    it('removes player and transfers host if host leaves', () => {
      const created = roomService.createRoom('Alice');
      const joined = roomService.joinRoom(created.roomCode, 'Bob');

      const result = roomService.removePlayer(
        created.roomCode,
        created.playerId,
      );
      expect(result.isRoomEmpty).toBe(false);
      expect(result.snapshot?.players).toHaveLength(1);
      expect(result.snapshot?.hostPlayerId).toBe(joined.playerId);
    });

    it('deletes room when last player leaves', () => {
      const created = roomService.createRoom('Alice');
      const result = roomService.removePlayer(
        created.roomCode,
        created.playerId,
      );
      expect(result.isRoomEmpty).toBe(true);
      expect(roomService.getRoomSnapshot(created.roomCode)).toBeNull();
    });
  });

  describe('getRoomSnapshot', () => {
    it('returns null for non-existent room', () => {
      expect(roomService.getRoomSnapshot(1234)).toBeNull();
    });

    it('returns snapshot for existing room', () => {
      const created = roomService.createRoom('Alice');
      const snapshot = roomService.getRoomSnapshot(created.roomCode);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.roomCode).toBe(created.roomCode);
    });
  });
});
