const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mmorpg_secret_key_2024';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const extractTokenFromSocket = (socket) => {
  return socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromSocket,
  JWT_SECRET
};