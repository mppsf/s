const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { GAME_CONFIG } = require('../../shared/constants/game');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const activePlayers = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'world', timestamp: Date.now() });
});

app.post('/api/spawn', async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    let character = await pool.query(
      'SELECT * FROM characters WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    if (character.rows.length === 0) {
      const result = await pool.query(
        'INSERT INTO characters (user_id, name, zone_id, x, y) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, username, GAME_CONFIG.ZONES.STARTING, GAME_CONFIG.MAP_SIZE/2, GAME_CONFIG.MAP_SIZE/2]
      );
      character = result;
    }
    
    const player = character.rows[0];
    activePlayers.set(userId, {
      ...player,
      lastUpdate: Date.now()
    });
    
    res.json({
      success: true,
      data: {
        id: player.id,
        name: player.name,
        zoneId: player.zone_id,
        x: player.x,
        y: player.y,
        level: player.level,
        hp: player.hp,
        maxHp: player.max_hp,
        mp: player.mp,
        maxMp: player.max_mp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/move', async (req, res) => {
  try {
    const { userId, x, y } = req.body;
    
    if (x < 0 || x > GAME_CONFIG.MAP_SIZE || y < 0 || y > GAME_CONFIG.MAP_SIZE) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }
    
    await pool.query(
      'UPDATE characters SET x = $1, y = $2 WHERE user_id = $3',
      [x, y, userId]
    );
    
    if (activePlayers.has(userId)) {
      const player = activePlayers.get(userId);
      player.x = x;
      player.y = y;
      player.lastUpdate = Date.now();
      activePlayers.set(userId, player);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/state', (req, res) => {
  const players = Array.from(activePlayers.values()).map(player => ({
    userId: player.user_id,
    name: player.name,
    x: player.x,
    y: player.y,
    level: player.level,
    hp: player.hp,
    maxHp: player.max_hp
  }));
  
  res.json({ success: true, data: { players } });
});

app.get('/api/zones', async (req, res) => {
  try {
    const zones = await pool.query('SELECT * FROM zones ORDER BY id');
    res.json({ success: true, data: zones.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/teleport', async (req, res) => {
  try {
    const { userId, zoneId, x, y } = req.body;
    
    const zone = await pool.query('SELECT * FROM zones WHERE id = $1', [zoneId]);
    if (zone.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Zone not found' });
    }
    
    await pool.query(
      'UPDATE characters SET zone_id = $1, x = $2, y = $3 WHERE user_id = $4',
      [zoneId, x, y, userId]
    );
    
    if (activePlayers.has(userId)) {
      const player = activePlayers.get(userId);
      player.zone_id = zoneId;
      player.x = x;
      player.y = y;
      player.lastUpdate = Date.now();
      activePlayers.set(userId, player);
    }
    
    res.json({ success: true, data: { zoneId, x, y } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [userId, player] of activePlayers.entries()) {
    if (now - player.lastUpdate > 30000) {
      activePlayers.delete(userId);
    }
  }
}, 10000);

const PORT = process.env.WORLD_PORT || 3002;
app.listen(PORT, () => {
  console.log(`World service running on port ${PORT}`);
});