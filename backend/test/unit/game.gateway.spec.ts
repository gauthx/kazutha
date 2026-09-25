import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from '../../src/game/game.gateway.js';
import { GameService, GameError } from '../../src/game/game.service.js';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let mockGameService: {
    createRoom: ReturnType<typeof vi.fn>;
    joinRoom: ReturnType<typeof vi.fn>;
    reconnectPlayer: ReturnType<typeof vi.fn>;
    disconnectPlayer: ReturnType<typeof vi.fn>;
    removePlayer: ReturnType<typeof vi.fn>;
    startGame: ReturnType<typeof vi.fn>;
    getRoomSnapshot: ReturnType<typeof vi.fn>;
  };
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      use: vi.fn(),
    };

    mockSocket = {
      id: 'socket-1',
      data: { playerId: 'player-1' },
      handshake: { auth: {} },
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
    };

    mockGameService = {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      reconnectPlayer: vi.fn(),
      disconnectPlayer: vi.fn(),
      removePlayer: vi.fn(),
      startGame: vi.fn(),
      getRoomSnapshot: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: GameService, useValue: mockGameService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gateway.server = mockServer;
  });

  describe('create-room', () => {
    it('creates room, joins socket, emits join-ack and broadcasts room-update', () => {
      const mockSnapshot = {
        roomCode: 1000,
        status: 'WAITING' as const,
        hostPlayerId: 'player-1',
        players: [],
      };
      mockGameService.createRoom.mockReturnValue({
        roomCode: 1000,
        playerId: 'player-1',
        snapshot: mockSnapshot,
      });

      gateway.handleCreateRoom(mockSocket, { displayName: 'Alice' });

      expect(mockGameService.createRoom).toHaveBeenCalledWith(
        'Alice',
        'socket-1',
        'player-1',
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1000');
      expect(mockSocket.emit).toHaveBeenCalledWith('join-ack', {
        playerId: 'player-1',
        roomCode: 1000,
      });
      expect(mockServer.to).toHaveBeenCalledWith('1000');
      expect(mockServer.emit).toHaveBeenCalledWith('room-update', mockSnapshot);
    });

    it('catches GameError and emits error event', () => {
      mockGameService.createRoom.mockImplementation(() => {
        throw new GameError('INVALID_DISPLAY_NAME', 'Invalid display name');
      });

      gateway.handleCreateRoom(mockSocket, { displayName: '' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'INVALID_DISPLAY_NAME',
        message: 'Invalid display name',
      });
    });
  });

  describe('join-room', () => {
    it('joins room, joins socket, emits join-ack and broadcasts room-update', () => {
      const mockSnapshot = {
        roomCode: 1000,
        status: 'WAITING' as const,
        hostPlayerId: 'host-1',
        players: [],
      };
      mockGameService.joinRoom.mockReturnValue({
        roomCode: 1000,
        playerId: 'player-1',
        snapshot: mockSnapshot,
      });

      gateway.handleJoinRoom(mockSocket, { displayName: 'Bob', roomCode: 1000 });

      expect(mockGameService.joinRoom).toHaveBeenCalledWith(
        1000,
        'Bob',
        'socket-1',
        'player-1',
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1000');
      expect(mockSocket.emit).toHaveBeenCalledWith('join-ack', {
        playerId: 'player-1',
        roomCode: 1000,
      });
      expect(mockServer.to).toHaveBeenCalledWith('1000');
      expect(mockServer.emit).toHaveBeenCalledWith('room-update', mockSnapshot);
    });

    it('catches GameError and emits error event', () => {
      mockGameService.joinRoom.mockImplementation(() => {
        throw new GameError('ROOM_NOT_FOUND', 'Room not found');
      });

      gateway.handleJoinRoom(mockSocket, { displayName: 'Bob', roomCode: 9999 });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    });
  });

  describe('start-game', () => {
    it('starts game, broadcasts game-started, and emits hand-dealt privately to each player', () => {
      const mockSnapshot = {
        roomCode: 1000,
        status: 'IN_PROGRESS' as const,
        hostPlayerId: 'player-1',
        players: [],
      };
      const playerAssignments = [
        {
          playerId: 'player-1',
          socketId: 'sock-1',
          hand: [{ suit: 'SPADES' as const, rank: 'A' as const }],
        },
        {
          playerId: 'player-2',
          socketId: 'sock-2',
          hand: [{ suit: 'HEARTS' as const, rank: 'K' as const }],
        },
      ];

      mockGameService.startGame.mockReturnValue({
        snapshot: mockSnapshot,
        playerAssignments,
      });

      gateway.handleStartGame(mockSocket, { roomCode: 1000 });

      expect(mockGameService.startGame).toHaveBeenCalledWith(1000, 'player-1');
      expect(mockServer.to).toHaveBeenCalledWith('1000');
      expect(mockServer.emit).toHaveBeenCalledWith('game-started', mockSnapshot);

      expect(mockServer.to).toHaveBeenCalledWith('sock-1');
      expect(mockServer.emit).toHaveBeenCalledWith('hand-dealt', {
        hand: playerAssignments[0].hand,
      });

      expect(mockServer.to).toHaveBeenCalledWith('sock-2');
      expect(mockServer.emit).toHaveBeenCalledWith('hand-dealt', {
        hand: playerAssignments[1].hand,
      });
    });

    it('catches GameError on start-game and emits error event', () => {
      mockGameService.startGame.mockImplementation(() => {
        throw new GameError('NOT_HOST', 'Only the host can start the game');
      });

      gateway.handleStartGame(mockSocket, { roomCode: 1000 });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: 'NOT_HOST',
        message: 'Only the host can start the game',
      });
    });
  });
});
