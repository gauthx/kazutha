import CardLib from '@heruka_urgyen/react-playing-cards';
import type { PlayerPublic } from '@shared/types';

const Card = (CardLib as any).default || CardLib;

interface OpponentHandProps {
  player: PlayerPublic;
  position?: 'top' | 'left' | 'right';
}

export function OpponentHand({ player, position = 'top' }: OpponentHandProps) {
  const cardBacks = Array.from({ length: Math.min(player.cardCount, 8) });

  return (
    <div className={`flex flex-col items-center ${position === 'left' || position === 'right' ? 'w-48' : ''}`}>
      <div className="flex items-center gap-2 mb-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
        <span
          className={`h-2 w-2 rounded-full ${
            player.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        <span className="text-xs font-semibold text-slate-200">
          {player.displayName}
        </span>
        <span className="text-xs text-indigo-400 font-mono">
          ({player.cardCount})
        </span>
      </div>

      <div className="flex justify-center -space-x-8 overflow-hidden py-1">
        {cardBacks.map((_, index) => (
          <div key={index} className="shadow-md shrink-0 w-[50px] h-[70px] aspect-[5/7]">
            <Card card="Ah" deckType="basic" height="70px" back />
          </div>
        ))}
      </div>
    </div>
  );
}
