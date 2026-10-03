import type { RoomSnapshot, Card } from '@shared/types';
import { PlayerHand } from './PlayerHand';
import { OpponentHand } from './OpponentHand';
import { RoundTable } from './RoundTable';
import { TurnIndicator } from './TurnIndicator';

interface GameTableProps {
  roomSnapshot: RoomSnapshot;
  localHand: Card[];
  localPlayerId: string;
  onPlayCard: (card: Card) => void;
  isSubmitting: boolean;
}

export function GameTable({
  roomSnapshot,
  localHand,
  localPlayerId,
  onPlayCard,
  isSubmitting,
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
        <div className="absolute inset-8 rounded-3xl bg-emerald-900/20 border-4 border-emerald-800/40 shadow-inner flex flex-col items-center justify-center">
          <div className="absolute top-6">
            <TurnIndicator
              currentRound={roomSnapshot.currentRound}
              localPlayerId={localPlayerId}
              players={roomSnapshot.players}
            />
          </div>
          <RoundTable currentRound={roomSnapshot.currentRound} players={roomSnapshot.players} />
        </div>

        <div className="absolute top-4 inset-x-0 flex justify-center gap-6 px-4 z-10 pointer-events-none">
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
        <PlayerHand
          hand={localHand}
          currentRound={roomSnapshot.currentRound}
          localPlayerId={localPlayerId}
          onPlayCard={onPlayCard}
          isSubmitting={isSubmitting}
        />
      </footer>
    </div>
  );
}
