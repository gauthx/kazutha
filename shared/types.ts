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
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];          
}

export interface RoomSnapshot {
  roomCode: string;
  status: GameStatus;
  hostPlayerId: string;
  players: PlayerPublic[];  
}

export interface JoinRoomPayload {
  displayName: string;
  roomCode: string;
}

export interface JoinAckPayload {
  playerId: string;
  roomCode: string;
}

export interface StateSyncPayload {
  hand: Card[];
  roomSnapshot: RoomSnapshot;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
