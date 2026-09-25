import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from '../../src/game/game.gateway.js';
import { GameStoreService } from '../../src/game/game-store.service.js';
import { DeckService } from '../../src/game/deck.service.js';

describe('GameGateway', () => {
  let gateway: GameGateway;
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
      data: {},
      handshake: { auth: {} },
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
    };

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
        GameGateway,
        { provide: GameStoreService, useValue: mockStore },
        { provide: DeckService, useValue: mockDeckService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gateway.server = mockServer;
  });

  it('rejects create-room if display name is invalid', () => {
    gateway.handleCreateRoom(mockSocket, { displayName: '' });
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      code: 'INVALID_DISPLAY_NAME',
      message: 'Display name must be between 1 and 24 characters',
    });

    gateway.handleCreateRoom(mockSocket, { displayName: 'a'.repeat(25) });
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      code: 'INVALID_DISPLAY_NAME',
      message: 'Display name must be between 1 and 24 characters',
    });
  });

  it('creates room, delegates to store, and broadcasts room-update', () => {
    const mockRoom = {
      roomCode: 1000,
      status: 'WAITING',
      players: new Map(),
      hostPlayerId: 'host-1',
    };
    mockStore.createRoom.mockReturnValue(mockRoom);
    mockStore.getRoom.mockReturnValue(mockRoom);
    mockStore.toRoomSnapshot.mockReturnValue({
      roomCode: 1000,
      status: 'WAITING',
      hostPlayerId: 'host-1',
      players: [{ playerId: 'host-1', displayName: 'Alice', cardCount: 0, isConnected: true }],
    });

    gateway.handleCreateRoom(mockSocket, { displayName: 'Alice' });

    expect(mockStore.createRoom).toHaveBeenCalledWith(expect.any(Number), expect.any(String));
    expect(mockSocket.join).toHaveBeenCalledWith(expect.any(String));
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'join-ack',
      expect.objectContaining({
        roomCode: expect.any(Number),
        playerId: expect.any(String),
      }),
    );
    expect(mockServer.to).toHaveBeenCalled();
    expect(mockServer.emit).toHaveBeenCalledWith('room-update', expect.objectContaining({ roomCode: 1000 }));
  });

  it('rejects join-room if room does not exist', () => {
    mockStore.getRoom.mockReturnValue(undefined);

    gateway.handleJoinRoom(mockSocket, { displayName: 'Bob', roomCode: 9999 });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Room not found',
    });
  });

  it('rejects join-room if room is full', () => {
    const mockRoom = {
      roomCode: 1000,
      status: 'WAITING',
      players: { size: 6, set: vi.fn() },
    };
    mockStore.getRoom.mockReturnValue(mockRoom);

    gateway.handleJoinRoom(mockSocket, { displayName: 'Bob', roomCode: 1000 });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      code: 'ROOM_FULL',
      message: 'Room is full (max 6 players)',
    });
  });

  it('rejects join-room if game has already started', () => {
    const mockRoom = {
      roomCode: 1000,
      status: 'IN_PROGRESS',
      players: { size: 2, set: vi.fn() },
    };
    mockStore.getRoom.mockReturnValue(mockRoom);

    gateway.handleJoinRoom(mockSocket, { displayName: 'Bob', roomCode: 1000 });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      code: 'GAME_IN_PROGRESS',
      message: 'Game is already in progress',
    });
  });

  it('joins room and emits join-ack and room-update', () => {
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
      players: [{ playerId: 'p-2', displayName: 'Bob', cardCount: 0, isConnected: true }],
    });

    gateway.handleJoinRoom(mockSocket, { displayName: 'Bob', roomCode: 1000 });

    expect(mockSocket.join).toHaveBeenCalledWith('1000');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'join-ack',
      expect.objectContaining({
        roomCode: 1000,
        playerId: expect.any(String),
      }),
    );
    expect(mockServer.to).toHaveBeenCalledWith('1000');
    expect(mockServer.emit).toHaveBeenCalledWith(
      'room-update',
      expect.objectContaining({ roomCode: 1000 }),
    );
  });
});
