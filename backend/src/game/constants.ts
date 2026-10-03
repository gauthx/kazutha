import type {
  Suit as SuitType,
  Rank as RankType,
  GameStatus as GameStatusType,
  ErrorCode as ErrorCodeType,
} from '@shared/types';

export const Suit = {
  SPADES: 'SPADES',
  HEARTS: 'HEARTS',
  DIAMONDS: 'DIAMONDS',
  CLUBS: 'CLUBS',
} as const satisfies Record<string, SuitType>;

export const Rank = {
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
} as const satisfies Record<string, RankType>;

export const GameStatus = {
  WAITING: 'WAITING',
  DEALING: 'DEALING',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
} as const satisfies Record<string, GameStatusType>;

export const ErrorCode = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_IN_PROGRESS: 'GAME_IN_PROGRESS',
  NOT_HOST: 'NOT_HOST',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  INVALID_DISPLAY_NAME: 'INVALID_DISPLAY_NAME',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  MUST_FOLLOW_SUIT: 'MUST_FOLLOW_SUIT',
  CARD_NOT_IN_HAND: 'CARD_NOT_IN_HAND',
} as const satisfies Record<string, ErrorCodeType>;
