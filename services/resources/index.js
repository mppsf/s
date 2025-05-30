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

const RESOURCE_TYPES = ['wood', 'stone', 'iron_ore'];
const activeResources = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resources', timestamp: Date.now() });
});

const spawnResource = async (zoneId) => {
  const type = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];
  const x = Math.random() * GAME_CONFIG.MAP_SIZE;
  const y = Math.random() * GAME_CONFIG.MAP_SIZE;
  
  const result = await pool.query(
    'INSERT INTO resources (zone_id, type, x, y, active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [zoneId, type, x, y, true]
  );
  
  const resource = result.rows[0];
  activeResources.set(resource.id, {
    ...resource,
    spawnedAt: Date.now()
  });
  
  return resource;
};

const initializeResources = async () => {
  const zones = await pool.query('SELECT id FROM zones');
  for (const zone of zones.rows) {
    const currentCount = await pool.query(
      'SELECT COUNT(*) FROM resources WHERE zone_id = $1 AND active = true',
      [zone.id]
    );
    
    const needed = GAME_CONFIG.RESOURCES.MAX_PER_ZONE - parseInt(currentCount.rows[0].count);
    for (let i = 0; i < needed; i++) {
      await spawnResource(zone.id);
    }
  }
};

app.get('/api/active', async (req, res) => {
  try {
    const resources = await pool.query(
      'SELECT * FROM resources WHERE active = true ORDER BY zone_id, type'
    );
    
    res.json({
      success: true,
      data: {
        resources: resources.rows.map(r => ({
          id: r.id,
          zoneId: r.zone_id,
          type: r.type,
          x: r.x,
          y: r.y
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/gather', async (req, res) => {
  try {
    const { userId, resourceId } = req.body;
    
    const resource = await pool.query(
      'SELECT * FROM resources WHERE id = $1 AND active = true',
      [resourceId]
    );
    
    if (resource.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Resource not found or already gathered' });
    }
    
    const character = await pool.query(
      'SELECT * FROM characters WHERE user_id = $1',
      [userId]
    );
    
    if (character.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Character not found' });
    }
    
    const player = character.rows[0];
    const res_data = resource.rows[0];
    
    const distance = Math.sqrt(
      Math.pow(player.x - res_data.x, 2) + Math.pow(player.y - res_data.y, 2)
    );
    
    if (distance > GAME_CONFIG.RESOURCES.SPAWN_RADIUS) {
      return res.status(400).json({ success: false, error: 'Too far from resource' });
    }
    
    await pool.query('UPDATE resources SET active = false WHERE id = $1', [resourceId]);
    
    const itemMapping = {
      'wood': 1,
      'stone': 2,
      'iron_ore': 3
    };
    
    const itemId = itemMapping[res_data.type];
    const quantity = Math.floor(Math.random() * 3) + 1;
    
    const existingSlot = await pool.query(
      'SELECT * FROM inventories WHERE character_id = $1 AND item_id = $2',
      [player.id, itemId]
    );
    
    if (existingSlot.rows.length > 0) {
      await pool.query(
        'UPDATE inventories SET quantity = quantity + $1 WHERE character_id = $2 AND item_id = $3',
        [quantity, player.id, itemId]
      );
    } else {
      const nextSlot = await pool.query(
        'SELECT COALESCE(MAX(slot_index), -1) + 1 as next_slot FROM inventories WHERE character_id = $1',
        [player.id]
      );
      
      if (nextSlot.rows[0].next_slot >= player.inventory_slots) {
        return res.status(400).json({ success: false, error: 'Inventory full' });
      }
      
      await pool.query(
        'INSERT INTO inventories (character_id, item_id, quantity, slot_index) VALUES ($1, $2, $3, $4)',
        [player.id, itemId, quantity, nextSlot.rows[0].next_slot]
      );
    }
    
    const inventory = await pool.query(
      'SELECT i.*, it.name FROM inventories i JOIN items it ON i.item_id = it.id WHERE i.character_id = $1 ORDER BY i.slot_index',
      [player.id]
    );
    
    activeResources.delete(resourceId);
    
    setTimeout(async () => {
      await spawnResource(res_data.zone_id);
    }, GAME_CONFIG.RESOURCES.RESPAWN_TIME);
    
    res.json({
      success: true,
      data: {
        gathered: { type: res_data.type, quantity },
        inventory: inventory.rows,
        resourceDespawned: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/zone/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;
    const resources = await pool.query(
      'SELECT * FROM resources WHERE zone_id = $1 AND active = true',
      [zoneId]
    );
    
    res.json({ success: true, data: resources.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

initializeResources();

setInterval(async () => {
  const zones = await pool.query('SELECT id FROM zones');
  for (const zone of zones.rows) {
    const currentCount = await pool.query(
      'SELECT COUNT(*) FROM resources WHERE zone_id = $1 AND active = true',
      [zone.id]
    );
    
    if (parseInt(currentCount.rows[0].count) < GAME_CONFIG.RESOURCES.MAX_PER_ZONE) {
      await spawnResource(zone.id);
    }
  }
}, 60000);

const PORT = process.env.RESOURCES_PORT || 3004;
app.listen(PORT, () => {
  console.log(`Resources service running on port ${PORT}`);
});