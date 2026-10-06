export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type GameStatus = 'WAITING' | 'DEALING' | 'IN_PROGRESS' | 'FINISHED';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface PlayerPublic {
  playerId: string;
  displayName: string;
  cardCount: number;
  isConnected: boolean;
  isSpectator?: boolean;
  finishPosition?: number | null;
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];
}

export interface PlayedCardPublic {
  playerId: string;
  card: Card;
}

export interface RoundSnapshot {
  roundNumber: number;
  ledSuit: Suit;
  currentTurnPlayerId: string;
  playedCards: PlayedCardPublic[];
}

export interface RoomSnapshot {
  roomCode: number;
  status: GameStatus;
  hostPlayerId: string;
  players: PlayerPublic[];
  currentRound: RoundSnapshot | null;
  nextRoundStarterId?: string | null;
  kazhuthaPlayerId?: string | null;
  finishOrder?: string[];
}

export interface JoinRoomPayload {
  displayName: string;
  roomCode: number;
}

export interface JoinAckPayload {
  playerId: string;
  roomCode: number;
}

export interface StateSyncPayload {
  hand: Card[];
  roomSnapshot: RoomSnapshot;
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_DISPLAY_NAME'
  | 'INTERNAL_ERROR'
  | 'NOT_YOUR_TURN'
  | 'MUST_FOLLOW_SUIT'
  | 'CARD_NOT_IN_HAND';

export interface ErrorPayload {
  code: ErrorCode | string;
  message: string;
}

export interface CreateRoomPayload {
  displayName: string;
}

export interface CreateRoomResponse {
  roomCode: number;
  playerId: string;
  snapshot: RoomSnapshot;
}

export interface JoinRoomResponse {
  roomCode: number;
  playerId: string;
  snapshot: RoomSnapshot;
}

export interface StartGamePayload {
  playerId: string;
}

export interface LeaveRoomPayload {
  playerId: string;
}

export interface PlayCardPayload {
  playerId: string;
  card: Card;
}

export interface RoundStartedPayload {
  roomSnapshot: RoomSnapshot;
  autoPlayedCard?: PlayedCardPublic;
}

export interface RoundUpdatePayload {
  roomSnapshot: RoomSnapshot;
}

export interface RoundEndedPayload {
  discardedCards: Card[];
  nextStarterPlayerId: string;
  roomSnapshot: RoomSnapshot;
}

export interface PlayCardAck {
  ok: true;
}

export interface PlayCardNack {
  ok: false;
  code: ErrorCode;
  message: string;
}
