import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import type { JoinAckPayload, ErrorPayload } from '@shared/types';

export function HomePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleJoinAck = (payload: JoinAckPayload) => {
      localStorage.setItem('playerId', payload.playerId);
      localStorage.setItem('roomCode', payload.roomCode.toString());
      navigate(`/room/${payload.roomCode}`);
    };

    const handleError = (payload: ErrorPayload) => {
      setError(payload.message);
    };

    socket.on('join-ack', handleJoinAck);
    socket.on('error', handleError);

    return () => {
      socket.off('join-ack', handleJoinAck);
      socket.off('error', handleError);
    };
  }, [navigate]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('Please enter a display name');
      return;
    }
    socket.emit('create-room', { displayName: trimmed });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = displayName.trim();
    const codeNum = parseInt(roomCodeInput.trim(), 10);

    if (!trimmedName) {
      setError('Please enter a display name');
      return;
    }
    if (isNaN(codeNum)) {
      setError('Please enter a valid 4-digit room code');
      return;
    }

    socket.emit('join-room', { displayName: trimmedName, roomCode: codeNum });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-white">
          കഴുത (Kazhutha)
        </h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Real-time multiplayer card game
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/20 border border-rose-500/50 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleCreateRoom}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-3 font-semibold text-white shadow-lg transition-colors cursor-pointer"
            >
              Create New Room
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-700" />
            <span className="absolute bg-slate-800 px-3 text-xs uppercase text-slate-500">
              or join existing
            </span>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                4-Digit Room Code
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="1000"
                maxLength={4}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5 text-center font-mono text-lg text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 py-3 font-semibold text-white transition-colors cursor-pointer"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
