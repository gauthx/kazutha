import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, connectSocket } from '../socket';
import { getRoom } from '../api';
import type { RoomSnapshot, StateSyncPayload } from '@shared/types';

export function useRoom(
  roomCodeInput?: number | string,
  initialSnapshot?: RoomSnapshot | null,
) {
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(
    initialSnapshot ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const localPlayerId = localStorage.getItem('playerId');
  const storedRoomCode = localStorage.getItem('roomCode');
  const code = roomCodeInput || storedRoomCode;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Poll room snapshot while game is in WAITING status (Lobby)
  useEffect(() => {
    if (!code) return;
    const numCode = Number(code);
    if (isNaN(numCode)) {
      setError('Invalid room code');
      return;
    }

    const fetchSnapshot = async () => {
      try {
        const snapshot = await getRoom(numCode);
        setRoomSnapshot(snapshot);
        if (snapshot.status === 'IN_PROGRESS') {
          stopPolling();
          connectSocket(localPlayerId || undefined, numCode);
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
      connectSocket(localPlayerId || undefined, numCode);
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

    socket.on('room-update', handleRoomUpdate);
    socket.on('game-started', handleGameStarted);
    socket.on('state-sync', handleStateSync);

    return () => {
      socket.off('room-update', handleRoomUpdate);
      socket.off('game-started', handleGameStarted);
      socket.off('state-sync', handleStateSync);
    };
  }, []);

  const isHost = Boolean(
    localPlayerId && roomSnapshot && roomSnapshot.hostPlayerId === localPlayerId,
  );

  return {
    roomSnapshot,
    setRoomSnapshot,
    isHost,
    localPlayerId,
    error,
    setError,
  };
}
