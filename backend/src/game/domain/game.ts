import type { Card, GameStatus, RoomSnapshot, PlayerPublic } from '@shared/types';
import { GameStatus as GameStatusConst, Suit, Rank, ErrorCode } from '../constants.js';
import { GameError, type PlayerHandAssignment } from '../game.service.js';
import { Player } from './player.js';
import { Round, type PlayedCard } from './round.js';

export interface PlayCardResult {
  snapshot: RoomSnapshot;
  roundEnded: boolean;
  discardedCards?: Card[];
  nextStarterPlayerId?: string;
  isVett?: boolean;
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
    const playerAssignments: PlayerHandAssignment[] = [];
    const playerList = Array.from(this.players.values());

    let handIndex = 0;
    for (const player of playerList) {
      const hand = hands[handIndex] || [];
      player.setHand(hand);
      playerAssignments.push({
        playerId: player.playerId,
        socketId: player.socketId,
        hand: [...player.getHand()],
      });
      handIndex++;
    }

    // Locate Ace of Spades
    let acePlayerId = '';
    const aceCard: Card = { suit: Suit.SPADES, rank: Rank.A };
    for (const player of playerList) {
      if (player.hasCard(aceCard)) {
        acePlayerId = player.playerId;
        break;
      }
    }

    if (!acePlayerId) {
      throw new Error('Ace of Spades not found in any player hand');
    }

    const acePlayer = this.players.get(acePlayerId)!;
    acePlayer.removeCard(aceCard);
    this.checkPlayerFinished(acePlayer);

    // Update assignment for ace player so they receive hand without A♠
    const aceAssignment = playerAssignments.find((p) => p.playerId === acePlayerId);
    if (aceAssignment) {
      aceAssignment.hand = [...acePlayer.getHand()];
    }

    this.roundCounter = 1;
    const allIds = Array.from(this.players.keys());
    const startIndex = allIds.indexOf(acePlayerId);
    const turnOrder = [...allIds.slice(startIndex), ...allIds.slice(0, startIndex)];
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
    if (this.status !== GameStatusConst.IN_PROGRESS) {
      throw new GameError(ErrorCode.GAME_IN_PROGRESS, 'Game is not in progress');
    }

    const player = this.players.get(playerId);
    if (!player) {
      throw new GameError(ErrorCode.ROOM_NOT_FOUND, 'Player not in room');
    }
    if (player.isSpectator()) {
      throw new GameError(ErrorCode.NOT_YOUR_TURN, 'Player has already finished and is spectating');
    }

    // Leading a new round (between rounds)
    if (!this.currentRound) {
      if (!this.nextRoundStarterId) {
        throw new GameError(ErrorCode.INTERNAL_ERROR, 'No round in progress and no next round starter set');
      }
      if (this.nextRoundStarterId !== playerId) {
        throw new GameError(ErrorCode.NOT_YOUR_TURN, 'It is not your turn');
      }
      if (!player.hasCard(card)) {
        throw new GameError(ErrorCode.CARD_NOT_IN_HAND, 'Card not in hand');
      }

      this.roundCounter++;
      const turnOrder = this.getActiveTurnOrder(playerId);
      this.currentRound = new Round({
        roundNumber: this.roundCounter,
        starterPlayerId: playerId,
        ledSuit: card.suit,
        turnOrder,
        initialPlay: { playerId, card },
      });
      this.nextRoundStarterId = null;

      player.removeCard(card);
      this.checkPlayerFinished(player);

      return {
        snapshot: this.toSnapshot(),
        roundEnded: false,
      };
    }

    // Playing into active round
    if (this.currentRound.currentTurnPlayerId !== playerId) {
      throw new GameError(ErrorCode.NOT_YOUR_TURN, 'It is not your turn');
    }
    if (!player.hasCard(card)) {
      throw new GameError(ErrorCode.CARD_NOT_IN_HAND, 'Card not in hand');
    }

    const hasLedSuit = player.hasSuit(this.currentRound.ledSuit);

    // VETT: Player lacks led suit and plays off-suit
    if (!hasLedSuit) {
      player.removeCard(card);
      const playedSoFar = this.currentRound.getPlayedCards().map((pc) => pc.card);
      // Collect all played cards from this round + the vett card
      player.addCards([...playedSoFar, card]);

      this.currentRound = null;
      this.nextRoundStarterId = playerId;

      return {
        snapshot: this.toSnapshot(),
        roundEnded: true,
        discardedCards: [],
        nextStarterPlayerId: playerId,
        isVett: true,
      };
    }

    // Must follow suit
    if (card.suit !== this.currentRound.ledSuit) {
      throw new GameError(ErrorCode.MUST_FOLLOW_SUIT, 'Must follow the led suit');
    }

    // NO VETT: Legal on-suit play
    player.removeCard(card);
    this.currentRound.addPlayedCard(playerId, card);
    this.checkPlayerFinished(player);

    // Check if round is complete (all active players have played)
    if (this.currentRound.isComplete()) {
      const highestPlay = this.currentRound.getHighestLedSuitPlay();
      const discardedCards = this.currentRound.getPlayedCards().map((pc) => pc.card);

      let nextStarter = highestPlay.playerId;
      const starterPlayer = this.players.get(nextStarter);
      // If the highest card holder finished on this play, find next active clockwise player
      if (starterPlayer?.isSpectator()) {
        const activeOrder = this.getActiveTurnOrder(nextStarter);
        nextStarter = activeOrder[0] ?? '';
      }

      this.currentRound = null;
      this.nextRoundStarterId = nextStarter;

      this.checkGameOver();

      return {
        snapshot: this.toSnapshot(),
        roundEnded: true,
        discardedCards,
        nextStarterPlayerId: nextStarter,
        isVett: false,
      };
    }

    // Round continues
    this.currentRound.advanceTurn();
    return {
      snapshot: this.toSnapshot(),
      roundEnded: false,
    };
  }

  private checkPlayerFinished(player: Player): void {
    if (player.cardCount === 0 && !player.isSpectator()) {
      this.finishOrder.push(player.playerId);
      player.markFinished(this.finishOrder.length);
    }
  }

  private checkGameOver(): void {
    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.status = GameStatusConst.FINISHED;
      if (active.length === 1) {
        const lastPlayer = active[0];
        if (!this.finishOrder.includes(lastPlayer.playerId)) {
          this.finishOrder.push(lastPlayer.playerId);
          lastPlayer.markFinished(this.finishOrder.length);
        }
      }
    }
  }

  toSnapshot(): RoomSnapshot {
    const players: PlayerPublic[] = Array.from(this.players.values()).map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      cardCount: p.cardCount,
      isConnected: p.isConnected,
    }));

    return {
      roomCode: this.roomCode,
      status: this.status,
      hostPlayerId: this.hostPlayerId,
      players,
      currentRound: this.currentRound ? this.currentRound.toSnapshot() : null,
      nextRoundStarterId: this.nextRoundStarterId,
    };
  }
}
