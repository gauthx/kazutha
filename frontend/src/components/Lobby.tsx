import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomSnapshot } from '@shared/types';
import { startGame, leaveRoom } from '../api';
import { ErrorBanner } from './ErrorBanner';

interface LobbyProps {
  roomSnapshot: RoomSnapshot;
  isHost: boolean;
  onRoomUpdate?: (snapshot: RoomSnapshot) => void;
}

export function Lobby({ roomSnapshot, isHost, onRoomUpdate }: LobbyProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [hostNotification, setHostNotification] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevHostRef = useRef(roomSnapshot.hostPlayerId);

  useEffect(() => {
    if (prevHostRef.current && prevHostRef.current !== roomSnapshot.hostPlayerId) {
      setHostNotification('Host has changed');
      const timer = setTimeout(() => setHostNotification(null), 3000);
      prevHostRef.current = roomSnapshot.hostPlayerId;
      return () => clearTimeout(timer);
    }
    prevHostRef.current = roomSnapshot.hostPlayerId;
  }, [roomSnapshot.hostPlayerId]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomSnapshot.roomCode.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleStartGame = async () => {
    const localPlayerId = localStorage.getItem('playerId');
    if (!localPlayerId) return;

    try {
      setIsStarting(true);
      setError(null);
      const res = await startGame(roomSnapshot.roomCode, localPlayerId);
      if (onRoomUpdate) {
        onRoomUpdate(res.snapshot);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    const localPlayerId = localStorage.getItem('playerId');
    try {
      setIsLeaving(true);
      if (localPlayerId) {
        await leaveRoom(roomSnapshot.roomCode, localPlayerId);
      }
    } catch {
      // Continue navigating away even if leave request fails
    } finally {
      localStorage.removeItem('roomCode');
      navigate('/');
    }
  };

  const playerCount = roomSnapshot.players.length;
  const canStart = isHost && playerCount >= 2 && !isStarting;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {hostNotification && (
          <div className="mb-4 rounded bg-indigo-500/20 border border-indigo-500/50 py-1.5 px-3 text-center text-xs font-semibold text-indigo-200">
            {hostNotification}
          </div>
        )}

        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
            Room Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-black text-indigo-400 tracking-wider">
              {roomSnapshot.roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Share this 4-digit code with friends to join
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Players ({playerCount}/6)
            </h2>
            <span className="text-xs text-slate-500">
              Min 2 players required
            </span>
          </div>

          <div className="space-y-2">
            {roomSnapshot.players.map((player) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between rounded-lg bg-slate-900/60 border border-slate-700/60 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      player.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-medium text-white">
                    {player.displayName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {player.playerId === roomSnapshot.hostPlayerId && (
                    <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-medium border border-indigo-500/30">
                      Host
                    </span>
                  )}
                  {!player.isConnected && (
                    <span className="text-xs text-amber-400">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <div>
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className={`w-full rounded-lg py-3 font-semibold text-white shadow-lg transition-colors ${
                canStart
                  ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isStarting
                ? 'Starting Game...'
                : playerCount < 2
                ? 'Waiting for at least 1 more player...'
                : 'Start Game'}
            </button>
          </div>
        ) : (
          <div className="text-center rounded-lg bg-slate-900/40 p-4 border border-slate-700/40">
            <p className="text-sm text-slate-400">
              Waiting for host to start the game...
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700/60">
          <button
            onClick={handleLeaveRoom}
            disabled={isLeaving}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLeaving ? 'Leaving Room...' : 'Leave Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
