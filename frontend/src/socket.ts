import { io, Socket } from 'socket.io-client';

export const socket: Socket = io({
  autoConnect: false,
  auth: (cb) => {
    const storedCode = localStorage.getItem('roomCode');
    cb({
      playerId: localStorage.getItem('playerId') || undefined,
      roomCode: storedCode ? parseInt(storedCode, 10) : undefined,
    });
  },
});

export function connectSocket(playerId?: string, roomCode?: number) {
  if (playerId && roomCode !== undefined) {
    socket.auth = {
      playerId,
      roomCode,
    };
  }
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}
