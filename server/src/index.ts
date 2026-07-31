import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { getDb, loadStore } from './store.ts';
import { api } from './api.ts';
import { wireSockets } from './sockets.ts';
import { seedDb } from './seed/generate.ts';

const PORT = Number(process.env.PORT ?? 3001);
const __dirname = dirname(fileURLToPath(import.meta.url));

loadStore();
// First boot: fill the arena with synthetic demo teams so leaderboards and
// matchmaking feel alive. Regenerate any time with `npm run seed`.
if (Object.keys(getDb().teams).length === 0) {
  const { teams, players } = seedDb();
  console.log(`[mathcity] seeded ${teams} synthetic teams / ${players} synthetic players`);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

// Serve the built client in production (single-server deployment).
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
});

const matchmaking = wireSockets(io);

// Bind explicitly to 0.0.0.0 — hosting routers (e.g. Render) detect and route
// to IPv4 binds; Node's default dual-stack bind confuses their port scanning.
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[mathcity] server listening on http://localhost:${PORT}`);
  console.log(`[mathcity] Socket.IO ready — multiplayer + demo mode available`);
});

process.on('SIGINT', () => {
  matchmaking.stop();
  process.exit(0);
});
