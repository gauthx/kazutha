import { Module } from '@nestjs/common';
import { DeckService } from './deck.service.js';
import { GameStoreService } from './game-store.service.js';

@Module({
  providers: [DeckService, GameStoreService],
  exports: [DeckService, GameStoreService],
})
export class GameModule {}
