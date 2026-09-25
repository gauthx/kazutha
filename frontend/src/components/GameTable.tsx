import type { RoomSnapshot, Card } from '@shared/types';
import { PlayerHand } from './PlayerHand';
import { OpponentHand } from './OpponentHand';

interface GameTableProps {
  roomSnapshot: RoomSnapshot;
  localHand: Card[];
  localPlayerId: string;
}

export function GameTable({
  roomSnapshot,
  localHand,
  localPlayerId,
}: GameTableProps) {
  const opponents = roomSnapshot.players.filter(
    (p) => p.playerId !== localPlayerId,
  );

  return (
    <div className="relative flex flex-col h-screen w-full bg-slate-950 overflow-hidden select-none">
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white tracking-wide">
            കഴുത
          </span>
          <span className="text-xs font-mono bg-slate-800 text-indigo-400 px-2 py-0.5 rounded border border-slate-700">
            Room {roomSnapshot.roomCode}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Players: {roomSnapshot.players.length}
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="absolute inset-8 rounded-3xl bg-emerald-900/20 border-4 border-emerald-800/40 shadow-inner flex items-center justify-center pointer-events-none">
          <div className="text-emerald-700/30 font-bold text-5xl tracking-widest uppercase">
            Kazhutha
          </div>
        </div>

        <div className="absolute top-4 inset-x-0 flex justify-center gap-6 px-4 z-10">
          {opponents.map((opponent) => (
            <OpponentHand
              key={opponent.playerId}
              player={opponent}
              position="top"
            />
          ))}
        </div>
      </div>

      <footer className="relative bg-slate-900/90 border-t border-slate-800 py-3 z-10 shadow-2xl">
        <PlayerHand hand={localHand} />
      </footer>
    </div>
  );
}
