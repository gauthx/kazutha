import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { GameService, GameError } from './game.service.js';
import type { PlayCardPayload, PlayCardAck, PlayCardNack } from '@shared/types';
import { ErrorCode } from './constants.js';

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

  constructor(private readonly gameService: GameService) {}

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
      roomCode?: number;
    };

    if (!auth?.playerId || auth.roomCode === undefined) {
      return;
    }

    const roomCode = auth.roomCode;
    const result = this.gameService.connectPlayer(
      roomCode,
      auth.playerId,
      socket.id,
    );

    if (result) {
      const timer = this.disconnectTimers.get(auth.playerId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(auth.playerId);
      }

      socket.join(roomCode.toString());
      socket.emit('state-sync', {
        hand: [...result.player.getHand()],
        roomSnapshot: result.snapshot,
      });

      this.server.to(roomCode.toString()).emit('room-update', result.snapshot);
    }
  }

  handleDisconnect(socket: Socket) {
    const result = this.gameService.disconnectPlayer(socket.id);
    if (!result) {
      return;
    }

    const { roomCode, player, snapshot } = result;
    this.server.to(roomCode.toString()).emit('room-update', snapshot);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.playerId);
      const removal = this.gameService.removePlayer(roomCode, player.playerId);

      if (!removal.isRoomEmpty && removal.snapshot) {
        this.server
          .to(roomCode.toString())
          .emit('room-update', removal.snapshot);
      }
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(player.playerId, timer);
  }

  private handleError(socket: Socket, err: unknown) {
    if (err instanceof GameError) {
      socket.emit('error', { code: err.code, message: err.message });
      return;
    }
    socket.emit('error', {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    });
  }

  @SubscribeMessage('play-card')
  handlePlayCard(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: PlayCardPayload,
  ): PlayCardAck | PlayCardNack {
    const auth = socket.handshake.auth as { roomCode?: number };
    const roomCode = auth.roomCode;
    const playerId = payload.playerId || socket.data.playerId;

    if (roomCode === undefined) {
      return {
        ok: false,
        code: ErrorCode.ROOM_NOT_FOUND,
        message: 'Invalid room',
      };
    }

    try {
      const result = this.gameService.playCard(
        roomCode,
        playerId,
        payload.card,
      );

      if (result.roundEnded) {
        this.server.to(roomCode.toString()).emit('round-ended', {
          discardedCards: result.discardedCards ?? [],
          nextStarterPlayerId: result.nextStarterPlayerId ?? '',
          roomSnapshot: result.snapshot,
          isVett: result.isVett ?? false,
          pileWinnerPlayerId: result.pileWinnerPlayerId ?? null,
        });

        if (result.isVett && result.pileWinnerPlayerId) {
          const winner = this.gameService.getPlayer(roomCode, result.pileWinnerPlayerId);
          if (winner?.socketId) {
            this.server.to(winner.socketId).emit('state-sync', {
              hand: [...winner.getHand()],
              roomSnapshot: result.snapshot,
            });
          }
        }
      } else {
        this.server.to(roomCode.toString()).emit('round-update', {
          roomSnapshot: result.snapshot,
        });
      }

      return { ok: true };
    } catch (err) {
      if (err instanceof GameError) {
        return { ok: false, code: err.code as any, message: err.message };
      }
      return {
        ok: false,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Unexpected error',
      };
    }
  }
}
