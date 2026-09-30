import type {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  StartGamePayload,
  LeaveRoomPayload,
  RoomSnapshot,
} from '@shared/types';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const err = await res.json();
      if (err?.message) {
        errorMsg = err.message;
      }
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export async function createRoom(displayName: string): Promise<CreateRoomResponse> {
  const payload: CreateRoomPayload = { displayName };
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<CreateRoomResponse>(res);
}

export async function joinRoom(
  roomCode: number,
  displayName: string,
): Promise<JoinRoomResponse> {
  const payload: Partial<JoinRoomPayload> = { displayName };
  const res = await fetch(`/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<JoinRoomResponse>(res);
}

export async function getRoom(roomCode: number): Promise<RoomSnapshot> {
  const res = await fetch(`/api/rooms/${roomCode}`);
  return handleResponse<RoomSnapshot>(res);
}

export async function startGame(
  roomCode: number,
  playerId: string,
): Promise<{ snapshot: RoomSnapshot }> {
  const payload: StartGamePayload = { playerId };
  const res = await fetch(`/api/rooms/${roomCode}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ snapshot: RoomSnapshot }>(res);
}

export async function leaveRoom(
  roomCode: number,
  playerId: string,
): Promise<{ success: boolean }> {
  const payload: LeaveRoomPayload = { playerId };
  const res = await fetch(`/api/rooms/${roomCode}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean }>(res);
}
