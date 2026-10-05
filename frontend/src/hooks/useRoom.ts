import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, connectSocket } from '../socket';
import { getRoom } from '../api';
import type { RoomSnapshot, StateSyncPayload } from '@shared/types';

export interface RoundResult {
  isVett: boolean;
  pileWinnerPlayerId: string | null;
  nextStarterPlayerId: string;
}

export function useRoom(
  roomCodeInput?: number,
  initialSnapshot?: RoomSnapshot | null,
) {
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(
    initialSnapshot ?? null,
  );
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localPlayerId = localStorage.getItem('playerId');
  const storedRoomCode = localStorage.getItem('roomCode');
  const code: number | undefined =
    roomCodeInput ?? (storedRoomCode ? parseInt(storedRoomCode, 10) : undefined);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Poll room snapshot while game is in WAITING status (Lobby)
  useEffect(() => {
    if (code === undefined || isNaN(code)) return;

    const fetchSnapshot = async () => {
      try {
        const snapshot = await getRoom(code);
        setRoomSnapshot(snapshot);
        if (snapshot.status === 'IN_PROGRESS') {
          stopPolling();
          connectSocket(localPlayerId || undefined, code);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch room');
        stopPolling();
      }
    };

    // If game is not in progress, fetch immediately and poll every 2 seconds
    if (!roomSnapshot || roomSnapshot.status === 'WAITING') {
      fetchSnapshot();
      pollingRef.current = setInterval(fetchSnapshot, 2000);
    } else if (roomSnapshot.status === 'IN_PROGRESS') {
      stopPolling();
      connectSocket(localPlayerId || undefined, code);
    }

    return () => {
      stopPolling();
    };
  }, [code, localPlayerId, stopPolling, roomSnapshot?.status]);

  // Socket event listeners for active gameplay
  useEffect(() => {
    const handleRoomUpdate = (snapshot: RoomSnapshot) => {
      setRoomSnapshot(snapshot);
    };

    const handleGameStarted = (snapshot: RoomSnapshot) => {
      setRoomSnapshot(snapshot);
    };

    const handleStateSync = (payload: StateSyncPayload) => {
      if (payload.roomSnapshot) {
        setRoomSnapshot(payload.roomSnapshot);
      }
    };

    const handleRoundStarted = (payload: import('@shared/types').RoundStartedPayload) => {
      setRoomSnapshot(payload.roomSnapshot);
      setRoundResult(null);
    };

    const handleRoundUpdate = (payload: import('@shared/types').RoundUpdatePayload) => {
      setRoomSnapshot(payload.roomSnapshot);
      if (payload.roomSnapshot.currentRound) {
        setRoundResult(null);
      }
    };

    const handleRoundEnded = (payload: import('@shared/types').RoundEndedPayload) => {
      setRoomSnapshot(payload.roomSnapshot);
      setRoundResult({
        isVett: payload.isVett,
        pileWinnerPlayerId: payload.pileWinnerPlayerId,
        nextStarterPlayerId: payload.nextStarterPlayerId,
      });
    };

    socket.on('room-update', handleRoomUpdate);
    socket.on('game-started', handleGameStarted);
    socket.on('state-sync', handleStateSync);
    socket.on('round-started', handleRoundStarted);
    socket.on('round-update', handleRoundUpdate);
    socket.on('round-ended', handleRoundEnded);

    return () => {
      socket.off('room-update', handleRoomUpdate);
      socket.off('game-started', handleGameStarted);
      socket.off('state-sync', handleStateSync);
      socket.off('round-started', handleRoundStarted);
      socket.off('round-update', handleRoundUpdate);
      socket.off('round-ended', handleRoundEnded);
    };
  }, []);

  const dismissRoundResult = useCallback(() => {
    setRoundResult(null);
  }, []);

  const isHost = Boolean(
    localPlayerId && roomSnapshot && roomSnapshot.hostPlayerId === localPlayerId,
  );

  return {
    roomSnapshot,
    setRoomSnapshot,
    roundResult,
    dismissRoundResult,
    isHost,
    localPlayerId,
    error,
    setError,
  };
}
