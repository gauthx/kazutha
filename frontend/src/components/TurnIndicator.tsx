import type { RoundSnapshot, PlayerPublic } from '@shared/types';

interface TurnIndicatorProps {
  currentRound: RoundSnapshot | null;
  localPlayerId: string;
  players: PlayerPublic[];
  nextRoundStarterId?: string | null;
}

export function TurnIndicator({ currentRound, localPlayerId, players, nextRoundStarterId }: TurnIndicatorProps) {
  if (!currentRound) {
    if (nextRoundStarterId === localPlayerId) {
      return (
        <div className="rounded-full bg-indigo-600/90 px-6 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] border border-indigo-400">
          Your Turn to Lead!
        </div>
      );
    }
    const starter = nextRoundStarterId
      ? players.find((p) => p.playerId === nextRoundStarterId)
      : null;
    const starterName = starter ? starter.displayName : 'next player';

    return (
      <div className="rounded-full bg-slate-800/80 px-6 py-2 text-sm font-medium text-slate-300 shadow-md">
        Waiting for <span className="font-bold text-white">{starterName}</span> to lead...
      </div>
    );
  }

  const isMyTurn = currentRound.currentTurnPlayerId === localPlayerId;

  if (isMyTurn) {
    return (
      <div className="rounded-full bg-indigo-600/90 px-6 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] border border-indigo-400">
        Your Turn!
      </div>
    );
  }

  const turnPlayer = players.find((p) => p.playerId === currentRound.currentTurnPlayerId);
  const displayName = turnPlayer ? turnPlayer.displayName : 'Unknown';

  return (
    <div className="rounded-full bg-slate-800/80 px-6 py-2 text-sm font-medium text-slate-300 shadow-md">
      Waiting for <span className="font-bold text-white">{displayName}</span>...
    </div>
  );
}
