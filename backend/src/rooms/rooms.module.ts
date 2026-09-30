import { Module, forwardRef } from '@nestjs/common';
import { RoomsController } from './rooms.controller.js';
import { RoomService } from './room.service.js';
import { GameModule } from '../game/game.module.js';

@Module({
  imports: [forwardRef(() => GameModule)],
  controllers: [RoomsController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomsModule {}
