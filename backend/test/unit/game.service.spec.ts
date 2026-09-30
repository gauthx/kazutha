import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameService, GameError } from '../../src/game/game.service.js';
import { GameStoreService } from '../../src/game/game-store.service.js';
import { DeckService } from '../../src/game/deck.service.js';

describe('GameService', () => {
  let service: GameService;
  let mockStore: {
    createRoom: ReturnType<typeof vi.fn>;
    getRoom: ReturnType<typeof vi.fn>;
    hasRoom: ReturnType<typeof vi.fn>;
    removePlayer: ReturnType<typeof vi.fn>;
    findPlayerBySocketId: ReturnType<typeof vi.fn>;
    toRoomSnapshot: ReturnType<typeof vi.fn>;
  };
  let mockDeckService: {
    createDeck: ReturnType<typeof vi.fn>;
    shuffleDeck: ReturnType<typeof vi.fn>;
    dealCards: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockStore = {
      createRoom: vi.fn(),
      getRoom: vi.fn(),
      hasRoom: vi.fn(),
      removePlayer: vi.fn(),
      findPlayerBySocketId: vi.fn(),
      toRoomSnapshot: vi.fn(),
    };

    mockDeckService = {
      createDeck: vi.fn(),
      shuffleDeck: vi.fn(),
      dealCards: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: GameStoreService, useValue: mockStore },
        { provide: DeckService, useValue: mockDeckService },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('startGame', () => {
    it('throws GameError if room does not exist', () => {
      mockStore.getRoom.mockReturnValue(undefined);
      expect(() => service.startGame(1000, 'host-1')).toThrow(GameError);
    });

    it('throws GameError if requester is not the host', () => {
      mockStore.getRoom.mockReturnValue({
        roomCode: 1000,
        hostPlayerId: 'host-1',
        players: new Map([
          ['host-1', {}],
          ['guest-1', {}],
        ]),
        status: 'WAITING',
      });

      expect(() => service.startGame(1000, 'not-host')).toThrow(GameError);
    });

    it('throws GameError if fewer than 2 players', () => {
      mockStore.getRoom.mockReturnValue({
        roomCode: 1000,
        hostPlayerId: 'host-1',
        players: new Map([['host-1', {}]]),
        status: 'WAITING',
      });

      expect(() => service.startGame(1000, 'host-1')).toThrow(GameError);
    });

    it('shuffles, deals cards, and returns playerAssignments', () => {
      const p1 = { playerId: 'host-1', socketId: 's1', hand: [] };
      const p2 = { playerId: 'guest-1', socketId: 's2', hand: [] };
      const mockRoom = {
        roomCode: 1000,
        hostPlayerId: 'host-1',
        players: new Map([
          ['host-1', p1],
          ['guest-1', p2],
        ]),
        status: 'WAITING',
      };
      mockStore.getRoom.mockReturnValue(mockRoom);
      mockStore.toRoomSnapshot.mockReturnValue({
        roomCode: 1000,
        status: 'IN_PROGRESS',
        hostPlayerId: 'host-1',
        players: [],
      });

      const mockDeck = [{ suit: 'SPADES' as const, rank: 'A' as const }];
      mockDeckService.createDeck.mockReturnValue(mockDeck);
      mockDeckService.shuffleDeck.mockReturnValue(mockDeck);
      mockDeckService.dealCards.mockReturnValue([mockDeck, mockDeck]);

      const result = service.startGame(1000, 'host-1');
      expect(mockRoom.status).toBe('IN_PROGRESS');
      expect(result.playerAssignments.length).toBe(2);
      expect(result.playerAssignments[0].socketId).toBe('s1');
      expect(result.playerAssignments[1].socketId).toBe('s2');
    });
  });

  describe('connectPlayer', () => {
    it('returns null if room or player not found', () => {
      mockStore.getRoom.mockReturnValue(undefined);
      expect(service.connectPlayer(1000, 'p-1', 'sock-1')).toBeNull();
    });

    it('updates player socketId and marks connected', () => {
      const player = { playerId: 'p-1', socketId: '', isConnected: false, lastSeen: 0 };
      const room = {
        roomCode: 1000,
        players: new Map([['p-1', player]]),
      };
      mockStore.getRoom.mockReturnValue(room);
      mockStore.toRoomSnapshot.mockReturnValue({ roomCode: 1000, players: [] });

      const result = service.connectPlayer(1000, 'p-1', 'sock-1');
      expect(result).not.toBeNull();
      expect(player.socketId).toBe('sock-1');
      expect(player.isConnected).toBe(true);
    });
  });

  describe('disconnectPlayer', () => {
    it('returns null if socketId not found', () => {
      mockStore.findPlayerBySocketId.mockReturnValue(undefined);
      expect(service.disconnectPlayer('unknown-sock')).toBeNull();
    });

    it('marks player as disconnected and returns snapshot', () => {
      const player = { playerId: 'p-1', isConnected: true, lastSeen: 0 };
      const room = { roomCode: 1000 };
      mockStore.findPlayerBySocketId.mockReturnValue({ room, player });
      mockStore.toRoomSnapshot.mockReturnValue({ roomCode: 1000 });

      const result = service.disconnectPlayer('sock-1');
      expect(result).not.toBeNull();
      expect(player.isConnected).toBe(false);
      expect(result?.roomCode).toBe(1000);
    });
  });

  describe('removePlayer', () => {
    it('delegates to store.removePlayer', () => {
      mockStore.removePlayer.mockReturnValue(false);
      mockStore.getRoom.mockReturnValue({ roomCode: 1000 });
      mockStore.toRoomSnapshot.mockReturnValue({ roomCode: 1000 });

      const result = service.removePlayer(1000, 'p-1');
      expect(mockStore.removePlayer).toHaveBeenCalledWith(1000, 'p-1');
      expect(result.isRoomEmpty).toBe(false);
    });
  });
});
