import { Module } from '@nestjs/common';
import { DeckService } from './deck.service.js';
import { GameStoreService } from './game-store.service.js';
import { GameService } from './game.service.js';
import { GameGateway } from './game.gateway.js';

@Module({
  providers: [DeckService, GameStoreService, GameService, GameGateway],
  exports: [DeckService, GameStoreService, GameService, GameGateway],
})
export class GameModule {}
