import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RoomsController } from '../../src/rooms/rooms.controller.js';
import { GameService, GameError } from '../../src/game/game.service.js';
import { RoomService } from '../../src/rooms/room.service.js';
import { GameGateway } from '../../src/game/game.gateway.js';
import { ErrorCode, GameStatus } from '../../src/game/constants.js';

describe('RoomsController', () => {
  let controller: RoomsController;
  let mockRoomService: {
    createRoom: ReturnType<typeof vi.fn>;
    joinRoom: ReturnType<typeof vi.fn>;
    getRoomSnapshot: ReturnType<typeof vi.fn>;
    removePlayer: ReturnType<typeof vi.fn>;
  };
  let mockGameService: {
    startGame: ReturnType<typeof vi.fn>;
  };
  let mockGameGateway: {
    server: {
      to: ReturnType<typeof vi.fn>;
    };
  };

  const sampleSnapshot = {
    roomCode: 1000,
    status: GameStatus.WAITING,
    hostPlayerId: 'host-1',
    players: [
      {
        playerId: 'host-1',
        displayName: 'Alice',
        cardCount: 0,
        isConnected: true,
      },
    ],
    currentRound: null,
  };

  beforeEach(() => {
    mockRoomService = {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      getRoomSnapshot: vi.fn(),
      removePlayer: vi.fn(),
    };

    mockGameService = {
      startGame: vi.fn(),
    };

    mockGameGateway = {
      server: {
        to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      },
    };

    controller = new RoomsController(
      mockRoomService as unknown as RoomService,
      mockGameService as unknown as GameService,
      mockGameGateway as unknown as GameGateway,
    );
  });

  describe('createRoom', () => {
    it('creates room and returns roomCode, playerId, and snapshot', () => {
      mockRoomService.createRoom.mockReturnValue({
        roomCode: 1000,
        playerId: 'player-1',
        snapshot: sampleSnapshot,
      });

      const response = controller.createRoom({ displayName: 'Alice' });

      expect(mockRoomService.createRoom).toHaveBeenCalledWith('Alice');
      expect(response).toEqual({
        roomCode: 1000,
        playerId: 'player-1',
        snapshot: sampleSnapshot,
      });
    });

    it('throws BAD_REQUEST when display name is invalid', () => {
      mockRoomService.createRoom.mockImplementation(() => {
        throw new GameError(
          ErrorCode.INVALID_DISPLAY_NAME,
          'Invalid display name',
        );
      });

      expect(() => controller.createRoom({ displayName: '' })).toThrow(
        HttpException,
      );
      try {
        controller.createRoom({ displayName: '' });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(err.getResponse()).toEqual({
          code: ErrorCode.INVALID_DISPLAY_NAME,
          message: 'Invalid display name',
        });
      }
    });
  });

  describe('joinRoom', () => {
    it('joins room and returns roomCode, playerId, and snapshot', () => {
      mockRoomService.joinRoom.mockReturnValue({
        roomCode: 1000,
        playerId: 'player-2',
        snapshot: sampleSnapshot,
      });

      const response = controller.joinRoom(1000, { displayName: 'Bob' });

      expect(mockRoomService.joinRoom).toHaveBeenCalledWith(1000, 'Bob');
      expect(response).toEqual({
        roomCode: 1000,
        playerId: 'player-2',
        snapshot: sampleSnapshot,
      });
    });

    it('throws NOT_FOUND when room does not exist', () => {
      mockRoomService.joinRoom.mockImplementation(() => {
        throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
      });

      expect(() => controller.joinRoom(9999, { displayName: 'Bob' })).toThrow(
        HttpException,
      );
      try {
        controller.joinRoom(9999, { displayName: 'Bob' });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('throws CONFLICT when room is full', () => {
      mockRoomService.joinRoom.mockImplementation(() => {
        throw new GameError(
          ErrorCode.ROOM_FULL,
          'Room is full (max 6 players)',
        );
      });

      expect(() => controller.joinRoom(1000, { displayName: 'Bob' })).toThrow(
        HttpException,
      );
      try {
        controller.joinRoom(1000, { displayName: 'Bob' });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });
  });

  describe('getRoom', () => {
    it('returns room snapshot when room exists', () => {
      mockRoomService.getRoomSnapshot.mockReturnValue(sampleSnapshot);

      const snapshot = controller.getRoom(1000);

      expect(mockRoomService.getRoomSnapshot).toHaveBeenCalledWith(1000);
      expect(snapshot).toEqual(sampleSnapshot);
    });

    it('throws NOT_FOUND when room does not exist', () => {
      mockRoomService.getRoomSnapshot.mockReturnValue(null);

      expect(() => controller.getRoom(9999)).toThrow(HttpException);
      try {
        controller.getRoom(9999);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  describe('startGame', () => {
    it('starts game and returns snapshot', () => {
      mockGameService.startGame.mockReturnValue({
        snapshot: { ...sampleSnapshot, status: GameStatus.IN_PROGRESS },
        playerAssignments: [],
        autoPlayedCard: undefined,
      });

      const response = controller.startGame(1000, { playerId: 'host-1' });

      expect(mockGameService.startGame).toHaveBeenCalledWith(1000, 'host-1');
      expect(response.snapshot.status).toBe(GameStatus.IN_PROGRESS);
    });

    it('throws FORBIDDEN when requester is not host', () => {
      mockGameService.startGame.mockImplementation(() => {
        throw new GameError(ErrorCode.NOT_HOST, 'Only host can start');
      });

      try {
        controller.startGame(1000, { playerId: 'not-host' });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('throws BAD_REQUEST when not enough players', () => {
      mockGameService.startGame.mockImplementation(() => {
        throw new GameError(
          ErrorCode.NOT_ENOUGH_PLAYERS,
          'At least 2 players required',
        );
      });

      try {
        controller.startGame(1000, { playerId: 'host-1' });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('leaveRoom', () => {
    it('removes player from room', () => {
      mockRoomService.removePlayer.mockReturnValue({ isRoomEmpty: false });

      const response = controller.leaveRoom(1000, { playerId: 'player-1' });

      expect(mockRoomService.removePlayer).toHaveBeenCalledWith(
        1000,
        'player-1',
      );
      expect(response).toEqual({ success: true });
    });
  });
});
