import { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { RoomSnapshot, StateSyncPayload } from '@shared/types';

export function useRoom() {
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(null);

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

  const localPlayerId = localStorage.getItem('playerId');
  const isHost = Boolean(
    localPlayerId && roomSnapshot && roomSnapshot.hostPlayerId === localPlayerId,
  );

  return {
    roomSnapshot,
    setRoomSnapshot,
    isHost,
    localPlayerId,
  };
}
