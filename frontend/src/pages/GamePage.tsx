import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { useHand } from '../hooks/useHand';
import { Lobby } from '../components/Lobby';
import { GameTable } from '../components/GameTable';
import { ErrorBanner } from '../components/ErrorBanner';
import { socket } from '../socket';
import type { ErrorPayload } from '@shared/types';

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSnapshot = location.state?.initialSnapshot;
  const { roomSnapshot, setRoomSnapshot, isHost, localPlayerId, error: roomError } = useRoom(
    code,
    initialSnapshot,
  );
  const { hand } = useHand();
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = (payload: ErrorPayload) => {
      setError(payload.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
    };
  }, []);

  const displayedError = error || roomError;

  if (displayedError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <ErrorBanner message={displayedError} onDismiss={() => setError(null)} />
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-white font-medium transition-colors cursor-pointer"
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

  return (
    <div className="relative">
      {!isConnected && roomSnapshot.status !== 'WAITING' && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-amber-500/90 text-slate-900 px-3 py-1.5 text-xs font-bold shadow-lg animate-pulse flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-900" />
          Reconnecting...
        </div>
      )}

      {roomSnapshot.status === 'WAITING' ? (
        <Lobby roomSnapshot={roomSnapshot} isHost={isHost} onRoomUpdate={setRoomSnapshot} />
      ) : (
        <GameTable
          roomSnapshot={roomSnapshot}
          localHand={hand}
          localPlayerId={localPlayerId || ''}
        />
      )}
    </div>
  );
}
