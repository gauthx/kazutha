import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GameService, GameError } from '../game/game.service.js';
import { RoomService } from './room.service.js';
import type {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  StartGamePayload,
  LeaveRoomPayload,
  RoomSnapshot,
} from '@shared/types';

export enum ErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  GAME_IN_PROGRESS = 'GAME_IN_PROGRESS',
  NOT_HOST = 'NOT_HOST',
  NOT_ENOUGH_PLAYERS = 'NOT_ENOUGH_PLAYERS',
  INVALID_DISPLAY_NAME = 'INVALID_DISPLAY_NAME',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

const ERROR_STATUS_MAP: Record<ErrorCode, HttpStatus> = {
  [ErrorCode.ROOM_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.NOT_HOST]: HttpStatus.FORBIDDEN,
  [ErrorCode.ROOM_FULL]: HttpStatus.CONFLICT,
  [ErrorCode.GAME_IN_PROGRESS]: HttpStatus.CONFLICT,
  [ErrorCode.INVALID_DISPLAY_NAME]: HttpStatus.BAD_REQUEST,
  [ErrorCode.NOT_ENOUGH_PLAYERS]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};

function toHttpException(err: unknown): HttpException {
  if (err instanceof GameError) {
    const status =
      ERROR_STATUS_MAP[err.code as ErrorCode] ?? HttpStatus.BAD_REQUEST;
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
    @Param('code') code: string,
    @Body() body: Partial<JoinRoomPayload>,
  ): JoinRoomResponse {
    try {
      const roomCode = Number(code);
      if (isNaN(roomCode)) {
        throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
      }
      const result = this.roomService.joinRoom(roomCode, body?.displayName || '');
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
  getRoom(@Param('code') code: string): RoomSnapshot {
    const roomCode = Number(code);
    if (isNaN(roomCode)) {
      throw new HttpException(
        { code: ErrorCode.ROOM_NOT_FOUND, message: 'Room not found' },
        HttpStatus.NOT_FOUND,
      );
    }
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
    @Param('code') code: string,
    @Body() body: StartGamePayload,
  ): { snapshot: RoomSnapshot } {
    try {
      const roomCode = Number(code);
      if (isNaN(roomCode)) {
        throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
      }
      const result = this.gameService.startGame(roomCode, body?.playerId);
      return { snapshot: result.snapshot };
    } catch (err) {
      throw toHttpException(err);
    }
  }

  @Post(':code/leave')
  leaveRoom(
    @Param('code') code: string,
    @Body() body: LeaveRoomPayload,
  ): { success: boolean } {
    try {
      const roomCode = Number(code);
      if (isNaN(roomCode)) {
        return { success: true };
      }
      this.roomService.removePlayer(roomCode, body?.playerId);
      return { success: true };
    } catch (err) {
      throw toHttpException(err);
    }
  }
}
