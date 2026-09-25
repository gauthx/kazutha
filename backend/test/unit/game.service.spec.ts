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

  describe('createRoom', () => {
    it('throws GameError if display name is invalid', () => {
      expect(() => service.createRoom('', 'sock-1')).toThrow(GameError);
      expect(() => service.createRoom('a'.repeat(25), 'sock-1')).toThrow(
        GameError,
      );
    });

    it('creates room and adds creator as first player', () => {
      const mockRoom = {
        roomCode: 1000,
        status: 'WAITING',
        players: new Map(),
        hostPlayerId: 'host-id',
      };
      mockStore.createRoom.mockReturnValue(mockRoom);
      mockStore.toRoomSnapshot.mockReturnValue({
        roomCode: 1000,
        status: 'WAITING',
        hostPlayerId: 'host-id',
        players: [],
      });

      const result = service.createRoom('Alice', 'sock-1', 'host-id');
      expect(result.roomCode).toBeDefined();
      expect(result.playerId).toBe('host-id');
      expect(mockStore.createRoom).toHaveBeenCalled();
      expect(mockRoom.players.has('host-id')).toBe(true);
    });
  });

  describe('joinRoom', () => {
    it('throws GameError when room is not found', () => {
      mockStore.getRoom.mockReturnValue(undefined);
      expect(() => service.joinRoom(1000, 'Bob', 'sock-2')).toThrow(GameError);
    });

    it('throws GameError when game is already in progress', () => {
      mockStore.getRoom.mockReturnValue({
        roomCode: 1000,
        status: 'IN_PROGRESS',
        players: new Map(),
      });
      expect(() => service.joinRoom(1000, 'Bob', 'sock-2')).toThrow(GameError);
    });

    it('throws GameError when room is full', () => {
      mockStore.getRoom.mockReturnValue({
        roomCode: 1000,
        status: 'WAITING',
        players: { size: 6, set: vi.fn() },
      });
      expect(() => service.joinRoom(1000, 'Bob', 'sock-2')).toThrow(GameError);
    });

    it('successfully joins a waiting room', () => {
      const mockRoom = {
        roomCode: 1000,
        status: 'WAITING',
        players: new Map(),
      };
      mockStore.getRoom.mockReturnValue(mockRoom);
      mockStore.toRoomSnapshot.mockReturnValue({
        roomCode: 1000,
        status: 'WAITING',
        hostPlayerId: 'host-1',
        players: [],
      });

      const result = service.joinRoom(1000, 'Bob', 'sock-2', 'p-2');
      expect(result.roomCode).toBe(1000);
      expect(result.playerId).toBe('p-2');
      expect(mockRoom.players.has('p-2')).toBe(true);
    });
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
});
