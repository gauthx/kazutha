import { io, Socket } from 'socket.io-client';

export const socket: Socket = io({
  autoConnect: false,
  auth: (cb) => {
    cb({
      playerId: localStorage.getItem('playerId') || undefined,
      roomCode: localStorage.getItem('roomCode') || undefined,
    });
  },
});

export function connectSocket(playerId?: string, roomCode?: number | string) {
  if (playerId && roomCode) {
    socket.auth = {
      playerId,
      roomCode: Number(roomCode),
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
