import type { Card, GameStatus, RoomSnapshot, PlayerPublic, RoundSnapshot } from '@shared/types';
import { GameStatus as GameStatusConst, Suit, Rank, ErrorCode } from '../constants.js';
import { GameError } from '../errors.js';
import { Player } from './player.js';
import { Round, compareRank, type PlayedCard } from './round.js';

export type { Card };

export interface PlayerHandAssignment {
  playerId: string;
  socketId: string;
  hand: Card[];
}

export interface PlayCardResult {
  snapshot: RoomSnapshot;
  roundEnded: boolean;
  discardedCards?: Card[];
  nextStarterPlayerId?: string;
  isVett?: boolean;
  pileWinnerPlayerId?: string;
  completedRound?: RoundSnapshot;
}

export class Game {
  readonly roomCode: number;
  hostPlayerId: string;
  status: GameStatus;
  createdAt: number;
  lastActivityAt: number;

  private readonly players: Map<string, Player> = new Map();
  private currentRound: Round | null = null;
  private nextRoundStarterId: string | null = null;
  private readonly finishOrder: string[] = [];
  private kazhuthaPlayerId: string | null = null;
  private roundCounter: number = 0;

  constructor(params: {
    roomCode: number;
    hostPlayerId?: string;
    status?: GameStatus;
    createdAt?: number;
    lastActivityAt?: number;
  }) {
    this.roomCode = params.roomCode;
    this.hostPlayerId = params.hostPlayerId ?? '';
    this.status = params.status ?? GameStatusConst.WAITING;
    this.createdAt = params.createdAt ?? Date.now();
    this.lastActivityAt = params.lastActivityAt ?? Date.now();
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getPlayers(): readonly Player[] {
    return Array.from(this.players.values());
  }

  get playerCount(): number {
    return this.players.size;
  }

  getCurrentRound(): Round | null {
    return this.currentRound;
  }

  getNextRoundStarterId(): string | null {
    return this.nextRoundStarterId;
  }

  getFinishOrder(): readonly string[] {
    return [...this.finishOrder];
  }

  getKazhuthaPlayerId(): string | null {
    return this.kazhuthaPlayerId;
  }

  addPlayer(player: Player): void {
    if (this.players.size >= 6) {
      throw new GameError(ErrorCode.ROOM_FULL, 'Room is full (max 6 players)');
    }
    if (this.status !== GameStatusConst.WAITING) {
      throw new GameError(ErrorCode.GAME_IN_PROGRESS, 'Game is already in progress');
    }
    this.players.set(player.playerId, player);
    if (!this.hostPlayerId) {
      this.hostPlayerId = player.playerId;
    }
    this.lastActivityAt = Date.now();
  }

  removePlayer(playerId: string): { isRoomEmpty: boolean } {
    this.players.delete(playerId);
    this.lastActivityAt = Date.now();
    if (this.players.size === 0) {
      return { isRoomEmpty: true };
    }
    if (this.hostPlayerId === playerId) {
      const next = this.players.values().next().value;
      if (next) {
        this.hostPlayerId = next.playerId;
      }
    }
    return { isRoomEmpty: false };
  }

  getActivePlayers(): Player[] {
    return Array.from(this.players.values()).filter((p) => !p.isSpectator());
  }

  getActiveTurnOrder(starterPlayerId: string): string[] {
    const activePlayers = this.getActivePlayers();
    const allIds = Array.from(this.players.keys());
    const startIndex = allIds.indexOf(starterPlayerId);
    if (startIndex === -1) {
      throw new Error(`Starter ${starterPlayerId} not found in room`);
    }

    const orderedAll = [...allIds.slice(startIndex), ...allIds.slice(0, startIndex)];
    const activeIds = new Set(activePlayers.map((p) => p.playerId));
    return orderedAll.filter((id) => activeIds.has(id));
  }

  start(hands: Card[][]): {
    autoPlayedCard: PlayedCard;
    playerAssignments: PlayerHandAssignment[];
  } {
    if (this.status !== GameStatusConst.WAITING) {
      throw new GameError(ErrorCode.GAME_IN_PROGRESS, 'Game is already in progress');
    }
    if (this.players.size < 2) {
      throw new GameError(ErrorCode.NOT_ENOUGH_PLAYERS, 'At least 2 players are required to start');
    }

    this.status = GameStatusConst.IN_PROGRESS;
    const playerList = Array.from(this.players.values());

    const playerAssignments: PlayerHandAssignment[] = playerList.map((player, i) => {
      player.setHand(hands[i] || []);
      return {
        playerId: player.playerId,
        socketId: player.socketId,
        hand: [...player.getHand()],
      };
    });

    const aceCard: Card = { suit: Suit.SPADES, rank: Rank.A };
    const aceOwner = playerList.find((player) => player.hasCard(aceCard));
    if (!aceOwner) {
      throw new Error('Ace of Spades not found in any player hand');
    }
    const acePlayerId = aceOwner.playerId;

    const acePlayer = this.players.get(acePlayerId)!;
    acePlayer.removeCard(aceCard);

    const aceAssignment = playerAssignments.find((p) => p.playerId === acePlayerId);
    if (aceAssignment) {
      aceAssignment.hand = [...acePlayer.getHand()];
    }

    this.roundCounter = 1;
    const turnOrder = this.getActiveTurnOrder(acePlayerId);
    this.currentRound = new Round({
      roundNumber: this.roundCounter,
      starterPlayerId: acePlayerId,
      ledSuit: Suit.SPADES,
      turnOrder,
      initialPlay: { playerId: acePlayerId, card: aceCard },
    });
    this.nextRoundStarterId = null;

    const autoPlayedCard: PlayedCard = {
      playerId: acePlayerId,
      card: aceCard,
      turnIndex: 0,
    };

    return { autoPlayedCard, playerAssignments };
  }

  playCard(playerId: string, card: Card): PlayCardResult {
    this.validateGameInProgress();

    const player = this.getPlayablePlayer(playerId);

    if (!this.currentRound) {
      return this.startRound(player, card);
    }

    return this.playIntoRound(player, card);
  }

  private validateGameInProgress(): void {
    if (this.status !== GameStatusConst.IN_PROGRESS) {
      throw new GameError(ErrorCode.GAME_IN_PROGRESS, 'Game is not in progress');
    }
  }

  private getPlayablePlayer(playerId: string): Player {
    const player = this.players.get(playerId);
    if (!player) {
      throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Player not in room');
    }
    if (player.isSpectator()) {
      throw new GameError(ErrorCode.NOT_YOUR_TURN, 'Player has already finished and is spectating');
    }
    return player;
  }

  private validateRoundStarter(playerId: string): void {
    if (!this.nextRoundStarterId) {
      throw new GameError(ErrorCode.INTERNAL_ERROR, 'No round in progress and no next round starter set');
    }
    if (this.nextRoundStarterId !== playerId) {
      throw new GameError(ErrorCode.NOT_YOUR_TURN, 'It is not your turn');
    }
  }

  private validateTurn(round: Round, playerId: string): void {
    if (round.currentTurnPlayerId !== playerId) {
      throw new GameError(ErrorCode.NOT_YOUR_TURN, 'It is not your turn');
    }
  }

  private validateCardInHand(player: Player, card: Card): void {
    if (!player.hasCard(card)) {
      throw new GameError(ErrorCode.CARD_NOT_IN_HAND, 'Card not in hand');
    }
  }

  private validateLedSuit(round: Round, card: Card): void {
    if (card.suit !== round.ledSuit) {
      throw new GameError(ErrorCode.MUST_FOLLOW_SUIT, 'Must follow the led suit');
    }
  }

  private startRound(player: Player, card: Card): PlayCardResult {
    this.validateRoundStarter(player.playerId);
    this.validateCardInHand(player, card);

    this.roundCounter++;
    const turnOrder = this.getActiveTurnOrder(player.playerId);
    this.currentRound = new Round({
      roundNumber: this.roundCounter,
      starterPlayerId: player.playerId,
      ledSuit: card.suit,
      turnOrder,
      initialPlay: { playerId: player.playerId, card },
    });
    this.nextRoundStarterId = null;

    player.removeCard(card);

    return {
      snapshot: this.toSnapshot(),
      roundEnded: false,
    };
  }

  private playIntoRound(player: Player, card: Card): PlayCardResult {
    const round = this.currentRound!;

    this.validateTurn(round, player.playerId);
    this.validateCardInHand(player, card);

    if (!player.hasSuit(round.ledSuit)) {
      return this.playVett(player, card, round);
    }

    this.validateLedSuit(round, card);

    player.removeCard(card);
    round.addPlayedCard(player.playerId, card);

    if (round.isComplete()) {
      return this.completeRound(round);
    }

    round.advanceTurn();
    return {
      snapshot: this.toSnapshot(),
      roundEnded: false,
    };
  }

  private playVett(player: Player, card: Card, round: Round): PlayCardResult {
    player.removeCard(card);
    const highestPlay = round.getHighestLedSuitPlay();
    const pileWinnerId = highestPlay.playerId;
    const pileWinner = this.players.get(pileWinnerId);
    if (!pileWinner) {
      throw new GameError(ErrorCode.INTERNAL_ERROR, 'Pile winner not found in room');
    }

    const playedSoFar = round.getPlayedCards().map((pc) => pc.card);
    pileWinner.addCards([...playedSoFar, card]);

    const roundSnapshot = round.toSnapshot();
    const completedRound: RoundSnapshot = {
      ...roundSnapshot,
      playedCards: [
        ...roundSnapshot.playedCards,
        { playerId: player.playerId, card },
      ],
    };

    this.resolveRoundEliminations();
    this.checkGameOver();

    const nextStarterId = (this.status as GameStatus) === GameStatusConst.FINISHED ? '' : pileWinnerId;
    this.currentRound = null;
    this.nextRoundStarterId = nextStarterId || null;

    return {
      snapshot: this.toSnapshot(),
      roundEnded: true,
      discardedCards: [],
      nextStarterPlayerId: nextStarterId,
      isVett: true,
      pileWinnerPlayerId: pileWinnerId,
      completedRound,
    };
  }

  private completeRound(round: Round): PlayCardResult {
    const highestPlay = round.getHighestLedSuitPlay();
    const discardedCards = round.getPlayedCards().map((pc) => pc.card);
    const completedRound = round.toSnapshot();

    this.resolveRoundEliminations();
    this.checkGameOver();

    let nextStarter = '';
    if ((this.status as GameStatus) !== GameStatusConst.FINISHED) {
      const ledPlays = round
        .getPlayedCards()
        .filter((pc) => pc.card.suit === round.ledSuit);
      ledPlays.sort((a, b) => compareRank(b.card.rank, a.card.rank));

      const nextStarterPlay = ledPlays.find((pc) => {
        const p = this.players.get(pc.playerId);
        return p && !p.isSpectator() && p.cardCount > 0;
      });

      nextStarter = nextStarterPlay?.playerId ?? '';
      if (!nextStarter) {
        const activeOrder = this.getActiveTurnOrder(highestPlay.playerId);
        nextStarter = activeOrder[0] ?? '';
      }
    }

    this.currentRound = null;
    this.nextRoundStarterId = nextStarter || null;

    return {
      snapshot: this.toSnapshot(),
      roundEnded: true,
      discardedCards,
      nextStarterPlayerId: nextStarter,
      isVett: false,
      completedRound,
    };
  }


  private resolveRoundEliminations(): void {
    if (this.currentRound) {
      for (const pc of this.currentRound.getPlayedCards()) {
        const player = this.players.get(pc.playerId);
        if (player && player.cardCount === 0 && !player.isSpectator()) {
          this.finishOrder.push(player.playerId);
          player.markFinished(this.finishOrder.length);
        }
      }
    }
    for (const player of this.players.values()) {
      if (player.cardCount === 0 && !player.isSpectator()) {
        this.finishOrder.push(player.playerId);
        player.markFinished(this.finishOrder.length);
      }
    }
  }

  private checkGameOver(): void {
    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.status = GameStatusConst.FINISHED;
      this.nextRoundStarterId = null;
      if (active.length === 1) {
        const lastPlayer = active[0];
        if (!this.finishOrder.includes(lastPlayer.playerId)) {
          this.finishOrder.push(lastPlayer.playerId);
          lastPlayer.markFinished(this.finishOrder.length);
        }
        this.kazhuthaPlayerId = lastPlayer.playerId;
      } else if (active.length === 0) {
        this.kazhuthaPlayerId = this.finishOrder[this.finishOrder.length - 1] ?? null;
      }
    }
  }

  toSnapshot(): RoomSnapshot {
    const players: PlayerPublic[] = Array.from(this.players.values()).map((p) => p.toPublic());

    return {
      roomCode: this.roomCode,
      status: this.status,
      hostPlayerId: this.hostPlayerId,
      players,
      currentRound: this.currentRound ? this.currentRound.toSnapshot() : null,
      nextRoundStarterId: this.nextRoundStarterId,
      kazhuthaPlayerId: this.kazhuthaPlayerId,
      finishOrder: [...this.finishOrder],
    };
  }
}
