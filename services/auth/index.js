const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET;

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash]
    );

    res.json({ success: true, data: { userId: result.rows[0].id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await pool.query('SELECT id, password_hash FROM users WHERE username = $1', [username]);
    
    if (user.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.rows[0].id, username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, data: { token, userId: user.rows[0].id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/validate', async (req, res) => {
  try {
    const { token } = req.body;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.userId]);
    
    if (user.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: { userId: user.rows[0].id, username: user.rows[0].username } });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

const PORT = process.env.AUTH_PORT || 3001;
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));

module.exports = { 
  validateToken: async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.userId]);
      return user.rows.length > 0 ? user.rows[0] : null;
    } catch (error) {
      return null;
    }
  }
};