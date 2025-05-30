# MMORPG Architecture

## Структура проекта
```
/mmorpg-game
├── /services
│   ├── /gateway          # WebSocket hub, роутинг между сервисами
│   ├── /auth            # JWT auth, user sessions
│   ├── /world           # Zone management, player positions
│   ├── /combat          # Real-time combat, damage calculations
│   ├── /resources       # Resource spawns, gathering system
│   ├── /craft           # Recipes, crafting logic
│   └── /database        # PostgreSQL models, migrations
├── /client
│   ├── /engine
│   │   ├── renderer.js  # Canvas rendering
│   │   ├── camera.js    # Viewport management
│   │   └── input.js     # Keyboard/mouse handling
│   ├── /systems
│   │   ├── player.js    # Player state management
│   │   ├── combat.js    # Combat UI and logic
│   │   ├── inventory.js # Inventory management
│   │   ├── craft.js     # Crafting interface
│   │   └── world.js     # World state sync
│   ├── /ui
│   │   ├── hud.js       # Health, mana, minimap
│   │   ├── chat.js      # Chat system
│   │   └── menus.js     # Game menus
│   └── main.js          # Client entry point
├── /shared
│   ├── /types           # TypeScript definitions
│   ├── /constants       # Game constants
│   └── /utils           # Shared utilities
├── docker-compose.yml
├── package.json
└── README.md
```

## Микросервисы Communication

### Gateway Service (Port 3000)
- WebSocket сервер для клиентов
- HTTP proxy для внутренних сервисов
- Message routing между сервисами

### Auth Service (Port 3001)
- User registration/login
- JWT token management
- Session validation

### World Service (Port 3002)
- Zone management (2048x2048 each)
- Player position tracking (free movement)
- Portal system and zone transitions
- Dynamic object spawning
- Collision detection

### Combat Service (Port 3003)
- Real-time damage calculations
- PvP/PvE combat logic
- Status effects
- Death/respawn

### Resources Service (Port 3004)
- Dynamic resource spawning
- Gathering mechanics
- Resource despawn timers
- Random spawn locations
- Resource type distribution

### Craft Service (Port 3005)
- Recipe management
- Crafting validation
- Item creation
- Skill progression

## База данных (PostgreSQL)

### Основные таблицы:
```sql
users (id, username, password_hash, created_at)
characters (id, user_id, name, zone_id, x, y, level, hp, mp, inventory_slots)
zones (id, name, width, height, portals)
items (id, name, type, stats, stackable, max_stack)
inventories (character_id, item_id, quantity, slot_index)
recipes (id, name, ingredients, result_item, skill_level)
resources (id, zone_id, type, x, y, spawn_time, respawn_delay, active)
portals (id, zone_id, x, y, target_zone_id, target_x, target_y)
```

## Клиент-сервер протокол

### WebSocket Messages:
```javascript
// Client -> Server
{type: 'player_move', x, y}
{type: 'combat_attack', target_id}
{type: 'resource_gather', resource_id}
{type: 'craft_item', recipe_id}
{type: 'portal_enter', portal_id}
{type: 'inventory_move', from_slot, to_slot}

// Server -> Client
{type: 'world_update', players, resources, items}
{type: 'zone_change', zone_id, spawn_x, spawn_y}
{type: 'combat_result', damage, target}
{type: 'inventory_update', items, slots_used, max_slots}
{type: 'resource_spawned', resource_id, x, y, type}
{type: 'resource_despawned', resource_id}
```

## Docker Configuration

### docker-compose.yml services:
- postgres (database)
- redis (session store)
- gateway (main entry)
- auth, world, combat, resources, craft (микросервисы)
- nginx (static files)

## Развертывание для ЛЛМ

### Контекст для разработки:
1. **Модульные файлы** - каждая система в отдельном файле
2. **Четкие интерфейсы** - типизированные API между сервисами
3. **Минимальные зависимости** - каждый сервис независим
4. **Стандартизированная структура** - одинаковые паттерны во всех сервисах

### Для работы с ЛЛМ:
- Каждый сервис содержит: index.js, routes.js, models.js, utils.js
- Общие типы в /shared для консистентности
- Четкая документация API в каждом сервисе
- Примеры запросов/ответов


