import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { useHand } from '../hooks/useHand';
import { Lobby } from '../components/Lobby';
import { socket } from '../socket';
import type { ErrorPayload } from '@shared/types';

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { roomSnapshot, isHost } = useRoom();
  const { hand } = useHand();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (payload: ErrorPayload) => {
      setError(payload.message);
    };

    socket.on('error', handleError);
    return () => {
      socket.off('error', handleError);
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 text-center border border-slate-700">
          <div className="mb-4 text-rose-400 font-semibold text-lg">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white font-medium transition-colors cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!roomSnapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400">Connecting to room {code}...</p>
        </div>
      </div>
    );
  }

  if (roomSnapshot.status === 'WAITING') {
    return <Lobby roomSnapshot={roomSnapshot} isHost={isHost} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Game in Progress</h2>
        <p className="text-slate-400 mb-4">Room {roomSnapshot.roomCode}</p>
        <p className="text-sm text-indigo-300">
          Hand size: {hand.length} cards
        </p>
      </div>
    </div>
  );
}
