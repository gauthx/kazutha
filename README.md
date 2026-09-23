# Kazhutha (കഴുത)

A real-time multiplayer web-based card game based on the traditional Indian card game Kazhutha (Donkey).

## Architecture

- **Backend**: NestJS + Socket.IO + TypeScript (in-memory state, port 3001)
- **Frontend**: React 18 + Vite + Tailwind CSS + Socket.IO client + `react-playing-cards` (port 5173)
- **Shared Types**: `shared/types.ts` imported via `@shared/*` path alias in both projects (types-only)

## Prerequisites

- Node.js 20+
- npm 9+

## Development Setup

### 1. Start the Backend

```bash
cd backend
npm install
npm run start:dev
```

The NestJS backend will start on `http://localhost:3001`.

### 2. Start the Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

The Vite dev server will start on `http://localhost:5173` and automatically proxy WebSocket and `/socket.io` requests to port 3001.

## Shared Types Convention

TypeScript types and interfaces shared between frontend and backend live in `shared/types.ts`.
Both `frontend/tsconfig.app.json` and `backend/tsconfig.json` configure the `@shared/*` path alias:

```typescript
import type { Card, GameRoom, RoomSnapshot } from '@shared/types';
```

`shared/` contains pure type declarations with no runtime imports from `node_modules`.
