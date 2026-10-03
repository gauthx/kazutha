import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from '../../src/game/game.gateway.js';
import { GameService } from '../../src/game/game.service.js';
import { Player } from '../../src/game/domain/player.js';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let mockGameService: {
    connectPlayer: ReturnType<typeof vi.fn>;
    disconnectPlayer: ReturnType<typeof vi.fn>;
    removePlayer: ReturnType<typeof vi.fn>;
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
      handshake: {
        auth: {
          playerId: 'player-1',
          roomCode: 1000,
        },
      },
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
    };

    mockGameService = {
      connectPlayer: vi.fn(),
      disconnectPlayer: vi.fn(),
      removePlayer: vi.fn(),
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

  describe('handleConnection', () => {
    it('connects player, joins socket room, emits state-sync and broadcasts room-update', () => {
      const mockSnapshot = {
        roomCode: 1000,
        status: 'IN_PROGRESS' as const,
        hostPlayerId: 'player-1',
        players: [],
      };
      const mockPlayer = new Player({
        playerId: 'player-1',
        displayName: 'Player 1',
        socketId: 'socket-1',
        initialHand: [{ suit: 'SPADES' as const, rank: 'A' as const }],
      });

      mockGameService.connectPlayer.mockReturnValue({
        player: mockPlayer,
        snapshot: mockSnapshot,
      });

      gateway.handleConnection(mockSocket);

      expect(mockGameService.connectPlayer).toHaveBeenCalledWith(
        1000,
        'player-1',
        'socket-1',
      );
      expect(mockSocket.join).toHaveBeenCalledWith('1000');
      expect(mockSocket.emit).toHaveBeenCalledWith('state-sync', {
        hand: [{ suit: 'SPADES', rank: 'A' }],
        roomSnapshot: mockSnapshot,
      });
      expect(mockServer.to).toHaveBeenCalledWith('1000');
      expect(mockServer.emit).toHaveBeenCalledWith('room-update', mockSnapshot);
    });

    it('ignores connection without playerId or roomCode', () => {
      mockSocket.handshake.auth = {};

      gateway.handleConnection(mockSocket);

      expect(mockGameService.connectPlayer).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('broadcasts room-update when player disconnects', () => {
      const mockSnapshot = {
        roomCode: 1000,
        status: 'IN_PROGRESS' as const,
        hostPlayerId: 'player-1',
        players: [],
      };
      const mockPlayer = { playerId: 'player-1' };

      mockGameService.disconnectPlayer.mockReturnValue({
        roomCode: 1000,
        player: mockPlayer,
        snapshot: mockSnapshot,
      });

      gateway.handleDisconnect(mockSocket);

      expect(mockGameService.disconnectPlayer).toHaveBeenCalledWith('socket-1');
      expect(mockServer.to).toHaveBeenCalledWith('1000');
      expect(mockServer.emit).toHaveBeenCalledWith('room-update', mockSnapshot);
    });
  });
});
