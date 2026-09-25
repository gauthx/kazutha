import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { GameStoreService } from './game-store.service.js';
import { DeckService } from './deck.service.js';
import { generateRoomCode } from '../utils/room-code.js';
import type { JoinRoomPayload } from '@shared/types';

const DISCONNECT_GRACE_MS = 30000;

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly store: GameStoreService,
    private readonly deckService: DeckService,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      const auth = socket.handshake.auth as { playerId?: string };
      socket.data.playerId = auth?.playerId || randomUUID();
      next();
    });
  }

  handleConnection(socket: Socket) {
    const auth = socket.handshake.auth as {
      playerId?: string;
      roomCode?: number | string;
    };

    if (!auth?.playerId || auth.roomCode === undefined) {
      return;
    }

    const roomCode = Number(auth.roomCode);
    const room = this.store.getRoom(roomCode);
    const player = room?.players.get(auth.playerId);

    if (room && player) {
      const timer = this.disconnectTimers.get(player.playerId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(player.playerId);
      }

      player.socketId = socket.id;
      player.isConnected = true;
      player.lastSeen = Date.now();

      socket.join(roomCode.toString());
      socket.emit('state-sync', {
        hand: player.hand,
        roomSnapshot: this.store.toRoomSnapshot(room),
      });

      this.broadcastRoomUpdate(roomCode);
    }
  }

  handleDisconnect(socket: Socket) {
    const found = this.store.findPlayerBySocketId(socket.id);
    if (!found) {
      return;
    }

    const { room, player } = found;
    player.isConnected = false;
    player.lastSeen = Date.now();

    this.broadcastRoomUpdate(room.roomCode);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.playerId);
      const isRoomEmpty = this.store.removePlayer(room.roomCode, player.playerId);

      if (!isRoomEmpty) {
        this.broadcastRoomUpdate(room.roomCode);
      }
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(player.playerId, timer);
  }

  @SubscribeMessage('create-room')
  handleCreateRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { displayName: string },
  ) {
    const displayName = payload?.displayName?.trim();
    if (!displayName || displayName.length > 24) {
      socket.emit('error', {
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be between 1 and 24 characters',
      });
      return;
    }

    const roomCode = generateRoomCode();
    const playerId = socket.data.playerId || randomUUID();
    const room = this.store.createRoom(roomCode, playerId);

    room.players.set(playerId, {
      playerId,
      displayName,
      socketId: socket.id,
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    socket.join(roomCode.toString());
    socket.emit('join-ack', { playerId, roomCode });
    this.broadcastRoomUpdate(roomCode);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const displayName = payload?.displayName?.trim();
    if (!displayName || displayName.length > 24) {
      socket.emit('error', {
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be between 1 and 24 characters',
      });
      return;
    }

    const roomCode = Number(payload.roomCode);
    const room = this.store.getRoom(roomCode);

    if (!room) {
      socket.emit('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
      return;
    }

    if (room.status !== 'WAITING') {
      socket.emit('error', {
        code: 'GAME_IN_PROGRESS',
        message: 'Game is already in progress',
      });
      return;
    }

    if (room.players.size >= 6) {
      socket.emit('error', {
        code: 'ROOM_FULL',
        message: 'Room is full (max 6 players)',
      });
      return;
    }

    const playerId = socket.data.playerId || randomUUID();
    room.players.set(playerId, {
      playerId,
      displayName,
      socketId: socket.id,
      hand: [],
      isConnected: true,
      lastSeen: Date.now(),
    });

    socket.join(roomCode.toString());
    socket.emit('join-ack', { playerId, roomCode });
    this.broadcastRoomUpdate(roomCode);
  }

  private broadcastRoomUpdate(roomCode: number) {
    const room = this.store.getRoom(roomCode);
    if (room) {
      this.server
        .to(roomCode.toString())
        .emit('room-update', this.store.toRoomSnapshot(room));
    }
  }
}
