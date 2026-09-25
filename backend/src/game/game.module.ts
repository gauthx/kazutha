import { Module } from '@nestjs/common';
import { DeckService } from './deck.service.js';
import { GameStoreService } from './game-store.service.js';
import { GameGateway } from './game.gateway.js';

@Module({
  providers: [DeckService, GameStoreService, GameGateway],
  exports: [DeckService, GameStoreService, GameGateway],
})
export class GameModule {}
