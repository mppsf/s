const GAME_CONFIG = {
  MAP_SIZE: 2048,
  TICK_RATE: 20,
  UPDATE_INTERVAL: 100,
  
  PLAYER_DEFAULTS: {
    HP: 100,
    MP: 50,
    STRENGTH: 10,
    LEVEL: 1,
    INVENTORY_SLOTS: 20,
    MOVE_SPEED: 150
  },

  COMBAT: {
    BASE_DAMAGE: 10,
    CRIT_CHANCE: 0.1,
    CRIT_MULTIPLIER: 1.5,
    ATTACK_COOLDOWN: 1000
  },

  RESOURCES: {
    SPAWN_RADIUS: 50,
    MAX_PER_ZONE: 100,
    RESPAWN_TIME: 300000,
    GATHER_TIME: 2000
  },

  ZONES: {
    STARTING: 1,
    FOREST: 2,
    MOUNTAIN: 3
  },

  ITEM_TYPES: {
    RESOURCE: 'resource',
    WEAPON: 'weapon',
    ARMOR: 'armor',
    CONSUMABLE: 'consumable'
  }
};

const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  PLAYER_MOVE: 'player.move',
  PLAYER_SPAWN: 'player.spawn',
  
  WORLD_UPDATE: 'world.update',
  ZONE_CHANGE: 'zone.change',
  
  COMBAT_ATTACK: 'combat.attack',
  COMBAT_RESULT: 'combat.result',
  COMBAT_DEATH: 'combat.death',
  
  RESOURCE_GATHER: 'resource.gather',
  RESOURCE_SPAWNED: 'resource.spawned',
  RESOURCE_DESPAWNED: 'resource.despawned',
  
  INVENTORY_ADD: 'inventory.add',
  INVENTORY_MOVE: 'inventory.move',
  INVENTORY_UPDATE: 'inventory.update',
  
  CRAFT_ITEM: 'craft.item',
  CRAFT_RESULT: 'craft.result',
  
  PORTAL_ENTER: 'portal.enter'
};

module.exports = { GAME_CONFIG, WEBSOCKET_EVENTS };