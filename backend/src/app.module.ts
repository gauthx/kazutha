import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module.js';
import { RoomsModule } from './rooms/rooms.module.js';

@Module({
  imports: [GameModule, RoomsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
