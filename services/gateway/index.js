const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { verifyToken, extractTokenFromSocket } = require('../../shared/utils/jwt');
const { WEBSOCKET_EVENTS } = require('../../shared/constants/game');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

const connectedPlayers = new Map();
const services = {
  auth: 'http://auth:3001',
  world: 'http://world:3002',
  combat: 'http://combat:3003',
  resources: 'http://resources:3004',
  craft: 'http://craft:3005'
};

const proxyToService = async (serviceName, path, method = 'GET', data = null) => {
  try {
    const fetch = require('node-fetch');
    const url = `${services[serviceName]}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(data && { body: JSON.stringify(data) })
    };
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(`Proxy error to ${serviceName}:`, error.message);
    return { success: false, error: error.message };
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway', timestamp: Date.now() });
});

app.all('/api/auth/*', async (req, res) => {
  const path = req.path.replace('/api/auth', '/api');
  const result = await proxyToService('auth', path, req.method, req.body);
  res.json(result);
});

app.all('/api/world/*', async (req, res) => {
  const path = req.path.replace('/api/world', '/api');
  const result = await proxyToService('world', path, req.method, req.body);
  res.json(result);
});

io.use(async (socket, next) => {
  const token = extractTokenFromSocket(socket);
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid token'));
  }
  
  socket.userId = decoded.userId;
  socket.username = decoded.username;
  next();
});

io.on(WEBSOCKET_EVENTS.CONNECTION, (socket) => {
  console.log(`Player connected: ${socket.username} (${socket.userId})`);
  
  connectedPlayers.set(socket.userId, {
    socketId: socket.id,
    username: socket.username,
    userId: socket.userId,
    connectedAt: Date.now()
  });

  socket.on(WEBSOCKET_EVENTS.PLAYER_SPAWN, async (data) => {
    const result = await proxyToService('world', '/api/spawn', 'POST', {
      userId: socket.userId,
      username: socket.username
    });
    
    if (result.success) {
      socket.emit(WEBSOCKET_EVENTS.PLAYER_SPAWN, result.data);
      socket.broadcast.emit(WEBSOCKET_EVENTS.WORLD_UPDATE, {
        type: 'player_joined',
        player: result.data
      });
    }
  });

  socket.on(WEBSOCKET_EVENTS.PLAYER_MOVE, async (data) => {
    const result = await proxyToService('world', '/api/move', 'POST', {
      userId: socket.userId,
      x: data.x,
      y: data.y
    });
    
    if (result.success) {
      socket.broadcast.emit(WEBSOCKET_EVENTS.WORLD_UPDATE, {
        type: 'player_moved',
        userId: socket.userId,
        x: data.x,
        y: data.y
      });
    }
  });

  socket.on(WEBSOCKET_EVENTS.COMBAT_ATTACK, async (data) => {
    const result = await proxyToService('combat', '/api/attack', 'POST', {
      attackerId: socket.userId,
      targetId: data.targetId
    });
    
    if (result.success) {
      io.emit(WEBSOCKET_EVENTS.COMBAT_RESULT, result.data);
    }
  });

  socket.on(WEBSOCKET_EVENTS.RESOURCE_GATHER, async (data) => {
    const result = await proxyToService('resources', '/api/gather', 'POST', {
      userId: socket.userId,
      resourceId: data.resourceId
    });
    
    if (result.success) {
      socket.emit(WEBSOCKET_EVENTS.INVENTORY_UPDATE, result.data.inventory);
      if (result.data.resourceDespawned) {
        io.emit(WEBSOCKET_EVENTS.RESOURCE_DESPAWNED, { resourceId: data.resourceId });
      }
    }
  });

  socket.on(WEBSOCKET_EVENTS.CRAFT_ITEM, async (data) => {
    const result = await proxyToService('craft', '/api/craft', 'POST', {
      userId: socket.userId,
      recipeId: data.recipeId
    });
    
    if (result.success) {
      socket.emit(WEBSOCKET_EVENTS.CRAFT_RESULT, result.data);
    }
  });

  socket.on(WEBSOCKET_EVENTS.DISCONNECT, () => {
    console.log(`Player disconnected: ${socket.username}`);
    connectedPlayers.delete(socket.userId);
    
    socket.broadcast.emit(WEBSOCKET_EVENTS.WORLD_UPDATE, {
      type: 'player_left',
      userId: socket.userId
    });
  });
});

setInterval(async () => {
  const worldState = await proxyToService('world', '/api/state', 'GET');
  const resources = await proxyToService('resources', '/api/active', 'GET');
  
  if (worldState.success && resources.success) {
    io.emit(WEBSOCKET_EVENTS.WORLD_UPDATE, {
      type: 'full_update',
      players: worldState.data.players,
      resources: resources.data.resources
    });
  }
}, 1000);

const PORT = process.env.GATEWAY_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Gateway service running on port ${PORT}`);
});