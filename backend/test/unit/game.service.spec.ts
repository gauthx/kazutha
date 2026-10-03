import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameService, GameError } from '../../src/game/game.service.js';
import { GameStoreService } from '../../src/game/game-store.service.js';
import { DeckService } from '../../src/game/deck.service.js';
import { Game } from '../../src/game/domain/game.js';
import { Player } from '../../src/game/domain/player.js';
import { GameStatus, Suit, Rank } from '../../src/game/constants.js';

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
      const game = new Game({ roomCode: 1000, hostPlayerId: 'host-1' });
      game.addPlayer(new Player({ playerId: 'host-1', displayName: 'Host' }));
      game.addPlayer(new Player({ playerId: 'guest-1', displayName: 'Guest' }));
      mockStore.getRoom.mockReturnValue(game);

      expect(() => service.startGame(1000, 'not-host')).toThrow(GameError);
    });

    it('throws GameError if fewer than 2 players', () => {
      const game = new Game({ roomCode: 1000, hostPlayerId: 'host-1' });
      game.addPlayer(new Player({ playerId: 'host-1', displayName: 'Host' }));
      mockStore.getRoom.mockReturnValue(game);

      expect(() => service.startGame(1000, 'host-1')).toThrow(GameError);
    });

    it('shuffles, deals cards, and returns playerAssignments', () => {
      const game = new Game({ roomCode: 1000, hostPlayerId: 'host-1' });
      game.addPlayer(new Player({ playerId: 'host-1', displayName: 'Host', socketId: 's1' }));
      game.addPlayer(new Player({ playerId: 'guest-1', displayName: 'Guest', socketId: 's2' }));
      mockStore.getRoom.mockReturnValue(game);

      const mockDeck = [
        { suit: Suit.SPADES, rank: Rank.A },
        { suit: Suit.HEARTS, rank: Rank.K },
      ];
      mockDeckService.createDeck.mockReturnValue(mockDeck);
      mockDeckService.shuffleDeck.mockReturnValue(mockDeck);
      mockDeckService.dealCards.mockReturnValue([
        [{ suit: Suit.SPADES, rank: Rank.A }],
        [{ suit: Suit.HEARTS, rank: Rank.K }],
      ]);

      const result = service.startGame(1000, 'host-1');
      expect(game.status).toBe(GameStatus.IN_PROGRESS);
      expect(result.playerAssignments.length).toBe(2);
      expect(result.playerAssignments[0].socketId).toBe('s1');
      expect(result.playerAssignments[1].socketId).toBe('s2');
      expect(result.autoPlayedCard.card).toEqual({ suit: Suit.SPADES, rank: Rank.A });
    });
  });

  describe('connectPlayer', () => {
    it('returns null if room or player not found', () => {
      mockStore.getRoom.mockReturnValue(undefined);
      expect(service.connectPlayer(1000, 'p-1', 'sock-1')).toBeNull();
    });

    it('updates player socketId and marks connected', () => {
      const game = new Game({ roomCode: 1000 });
      const player = new Player({
        playerId: 'p-1',
        displayName: 'P1',
        socketId: '',
        isConnected: false,
      });
      game.addPlayer(player);
      mockStore.getRoom.mockReturnValue(game);

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
      const game = new Game({ roomCode: 1000 });
      const player = new Player({ playerId: 'p-1', displayName: 'P1', isConnected: true });
      game.addPlayer(player);
      mockStore.findPlayerBySocketId.mockReturnValue({ room: game, player });

      const result = service.disconnectPlayer('sock-1');
      expect(result).not.toBeNull();
      expect(player.isConnected).toBe(false);
      expect(result?.roomCode).toBe(1000);
    });
  });

  describe('removePlayer', () => {
    it('delegates to store.removePlayer', () => {
      const game = new Game({ roomCode: 1000 });
      mockStore.removePlayer.mockReturnValue(false);
      mockStore.getRoom.mockReturnValue(game);

      const result = service.removePlayer(1000, 'p-1');
      expect(mockStore.removePlayer).toHaveBeenCalledWith(1000, 'p-1');
      expect(result.isRoomEmpty).toBe(false);
    });
  });
});
