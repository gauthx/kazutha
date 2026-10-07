import { useEffect } from 'react';
import type { PlayerPublic } from '@shared/types';
import type { RoundResult } from '../hooks/useRoom';

interface RoundResultBannerProps {
  roundResult: RoundResult | null;
  players: PlayerPublic[];
  onDismiss: () => void;
}

export function RoundResultBanner({
  roundResult,
  players,
  onDismiss,
}: RoundResultBannerProps) {
  useEffect(() => {
    if (!roundResult) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [roundResult, onDismiss]);

  if (!roundResult) return null;

  const winner = players.find(
    (p) => p.playerId === (roundResult.pileWinnerPlayerId || roundResult.nextStarterPlayerId),
  );
  const winnerName = winner ? winner.displayName : 'A player';

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl border cursor-pointer backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
        roundResult.isVett
          ? 'bg-amber-950/90 border-amber-600/60 text-amber-200'
          : 'bg-emerald-950/90 border-emerald-600/60 text-emerald-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">
          {roundResult.isVett ? '⚡' : '✨'}
        </span>
        <div>
          <div className="text-sm font-bold tracking-wide">
            {roundResult.isVett ? 'വെട്ട്! (Vett!)' : 'Round Complete'}
          </div>
          <div className="text-xs text-slate-300">
            {roundResult.isVett
              ? `${winnerName} takes the pile and leads the next round`
              : `${winnerName} played the highest card and leads next`}
          </div>
        </div>
      </div>
    </div>
  );
}
