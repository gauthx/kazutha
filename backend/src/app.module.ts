import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module.js';

@Module({
  imports: [GameModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
