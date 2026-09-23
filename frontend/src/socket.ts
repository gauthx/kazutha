import { io, Socket } from 'socket.io-client';

export const socket: Socket = io({
  auth: (cb) => {
    cb({
      playerId: localStorage.getItem('playerId') || undefined,
      roomCode: localStorage.getItem('roomCode') || undefined,
    });
  },
});
