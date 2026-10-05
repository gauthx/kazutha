import type { RoundSnapshot, PlayerPublic, Suit } from '@shared/types';
import CardLib from '@heruka_urgyen/react-playing-cards';
import { toCardCode } from '../utils/cardCode';

const Card = (CardLib as any).default || CardLib;

interface RoundTableProps {
  currentRound: RoundSnapshot | null;
  players: PlayerPublic[];
  nextRoundStarterId?: string | null;
}

const SUIT_DISPLAY: Record<Suit, string> = {
  SPADES: '♠ Spades',
  HEARTS: '♥ Hearts',
  DIAMONDS: '♦ Diamonds',
  CLUBS: '♣ Clubs',
};

export function RoundTable({ currentRound, players, nextRoundStarterId }: RoundTableProps) {
  if (!currentRound) {
    const starter = nextRoundStarterId
      ? players.find((p) => p.playerId === nextRoundStarterId)
      : null;
    const starterText = starter
      ? `Waiting for ${starter.displayName} to start the next round...`
      : 'Waiting for round to start...';

    return (
      <div className="flex h-64 w-full max-w-2xl items-center justify-center rounded-2xl bg-emerald-900/30 border border-emerald-800/50">
        <p className="text-emerald-300/80 font-medium">{starterText}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-64 w-full max-w-2xl items-center justify-center rounded-2xl bg-slate-900/50 border border-slate-800 p-6 relative">
      {currentRound.ledSuit && (
        <div className="absolute top-4 left-4 rounded bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-300 shadow">
          Led Suit: <span className="text-white">{SUIT_DISPLAY[currentRound.ledSuit]}</span>
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
        {currentRound.playedCards.map((playedCard, idx) => {
          const player = players.find((p) => p.playerId === playedCard.playerId);
          const displayName = player ? player.displayName : 'Unknown';
          const code = toCardCode(playedCard.card);

          return (
            <div key={`${playedCard.playerId}-${idx}`} className="flex flex-col items-center gap-2">
              <Card card={code} deckType="basic" height="80px" />
              <span className="text-xs font-medium text-slate-400">{displayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
