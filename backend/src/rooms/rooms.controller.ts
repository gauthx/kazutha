import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { GameService, GameError } from '../game/game.service.js';
import { RoomService } from './room.service.js';
import { ErrorCode } from '../game/constants.js';
import { GameGateway } from '../game/game.gateway.js';
import type {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  StartGamePayload,
  LeaveRoomPayload,
  RoomSnapshot,
  ErrorCode as ErrorCodeType,
} from '@shared/types';

const ERROR_STATUS_MAP: Record<ErrorCodeType, HttpStatus> = {
  [ErrorCode.ROOM_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.NOT_HOST]: HttpStatus.FORBIDDEN,
  [ErrorCode.ROOM_FULL]: HttpStatus.CONFLICT,
  [ErrorCode.GAME_IN_PROGRESS]: HttpStatus.CONFLICT,
  [ErrorCode.INVALID_DISPLAY_NAME]: HttpStatus.BAD_REQUEST,
  [ErrorCode.NOT_ENOUGH_PLAYERS]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.NOT_YOUR_TURN]: HttpStatus.BAD_REQUEST,
  [ErrorCode.MUST_FOLLOW_SUIT]: HttpStatus.BAD_REQUEST,
  [ErrorCode.CARD_NOT_IN_HAND]: HttpStatus.BAD_REQUEST,
};

function toHttpException(err: unknown): HttpException {
  if (err instanceof GameError) {
    const status =
      ERROR_STATUS_MAP[err.code as ErrorCodeType] ?? HttpStatus.BAD_REQUEST;
    return new HttpException({ code: err.code, message: err.message }, status);
  }
  if (err instanceof HttpException) {
    return err;
  }
  return new HttpException(
    { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred' },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

@Controller('api/rooms')
export class RoomsController {
  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly gameGateway: GameGateway,
  ) {}

  @Post()
  createRoom(@Body() body: CreateRoomPayload): CreateRoomResponse {
    try {
      const result = this.roomService.createRoom(body?.displayName);
      return {
        roomCode: result.roomCode,
        playerId: result.playerId,
        snapshot: result.snapshot,
      };
    } catch (err) {
      throw toHttpException(err);
    }
  }

  @Post(':code/join')
  joinRoom(
    @Param('code', ParseIntPipe) roomCode: number,
    @Body() body: Partial<JoinRoomPayload>,
  ): JoinRoomResponse {
    try {
      const result = this.roomService.joinRoom(
        roomCode,
        body?.displayName || '',
      );
      return {
        roomCode: result.roomCode,
        playerId: result.playerId,
        snapshot: result.snapshot,
      };
    } catch (err) {
      throw toHttpException(err);
    }
  }

  @Get(':code')
  getRoom(@Param('code', ParseIntPipe) roomCode: number): RoomSnapshot {
    const snapshot = this.roomService.getRoomSnapshot(roomCode);
    if (!snapshot) {
      throw new HttpException(
        { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return snapshot;
  }

  @Post(':code/start')
  startGame(
    @Param('code', ParseIntPipe) roomCode: number,
    @Body() body: StartGamePayload,
  ): { snapshot: RoomSnapshot } {
    try {
      const result = this.gameService.startGame(roomCode, body?.playerId);

      this.gameGateway.server.to(roomCode.toString()).emit('round-started', {
        roomSnapshot: result.snapshot,
        autoPlayedCard: result.autoPlayedCard,
      });

      for (const p of result.playerAssignments) {
        if (p.socketId) {
          this.gameGateway.server.to(p.socketId).emit('state-sync', {
            hand: p.hand,
            roomSnapshot: result.snapshot,
          });
        }
      }

      return { snapshot: result.snapshot };
    } catch (err) {
      throw toHttpException(err);
    }
  }

  @Post(':code/leave')
  leaveRoom(
    @Param('code', ParseIntPipe) roomCode: number,
    @Body() body: LeaveRoomPayload,
  ): { success: boolean } {
    try {
      this.roomService.removePlayer(roomCode, body?.playerId);
      return { success: true };
    } catch (err) {
      throw toHttpException(err);
    }
  }
}
