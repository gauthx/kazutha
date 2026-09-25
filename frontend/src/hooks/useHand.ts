import { useState, useEffect } from 'react';
import { socket } from '../socket';
import type { Card, StateSyncPayload } from '@shared/types';

export function useHand() {
  const [hand, setHand] = useState<Card[]>([]);

  useEffect(() => {
    const handleHandDealt = (payload: { hand: Card[] }) => {
      if (Array.isArray(payload.hand)) {
        setHand(payload.hand);
      }
    };

    const handleStateSync = (payload: StateSyncPayload) => {
      if (Array.isArray(payload.hand)) {
        setHand(payload.hand);
      }
    };

    socket.on('hand-dealt', handleHandDealt);
    socket.on('state-sync', handleStateSync);

    return () => {
      socket.off('hand-dealt', handleHandDealt);
      socket.off('state-sync', handleStateSync);
    };
  }, []);

  return {
    hand,
    setHand,
  };
}
