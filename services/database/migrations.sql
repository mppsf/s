CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    width INTEGER DEFAULT 2048,
    height INTEGER DEFAULT 2048,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    zone_id INTEGER REFERENCES zones(id) DEFAULT 1,
    x FLOAT DEFAULT 1024,
    y FLOAT DEFAULT 1024,
    level INTEGER DEFAULT 1,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    mp INTEGER DEFAULT 50,
    max_mp INTEGER DEFAULT 50,
    strength INTEGER DEFAULT 10,
    inventory_slots INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    stats JSONB DEFAULT '{}',
    stackable BOOLEAN DEFAULT true,
    max_stack INTEGER DEFAULT 64,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventories (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id),
    quantity INTEGER DEFAULT 1,
    slot_index INTEGER NOT NULL,
    PRIMARY KEY (character_id, slot_index)
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ingredients JSONB NOT NULL,
    result_item INTEGER REFERENCES items(id),
    result_quantity INTEGER DEFAULT 1,
    skill_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id INTEGER REFERENCES zones(id),
    type VARCHAR(50) NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    spawn_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respawn_delay INTEGER DEFAULT 300,
    active BOOLEAN DEFAULT true
);

CREATE TABLE portals (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES zones(id),
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    target_zone_id INTEGER REFERENCES zones(id),
    target_x FLOAT NOT NULL,
    target_y FLOAT NOT NULL
);

INSERT INTO zones (name) VALUES 
    ('Starting Zone'),
    ('Forest Zone'),
    ('Mountain Zone');

INSERT INTO items (name, type, stackable, max_stack) VALUES
    ('Wood', 'resource', true, 64),
    ('Stone', 'resource', true, 64),
    ('Iron Ore', 'resource', true, 64),
    ('Basic Sword', 'weapon', false, 1),
    ('Health Potion', 'consumable', true, 10);

INSERT INTO recipes (name, ingredients, result_item, result_quantity) VALUES
    ('Basic Sword', '{"1": 5, "2": 3}', 4, 1);

CREATE INDEX idx_characters_zone ON characters(zone_id);
CREATE INDEX idx_resources_zone_active ON resources(zone_id, active);
CREATE INDEX idx_inventories_character ON inventories(character_id);