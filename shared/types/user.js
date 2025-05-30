const USER_ROLES = {
  PLAYER: 'player',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away'
};

const createUser = (id, username, role = USER_ROLES.PLAYER) => ({
  id,
  username,
  role,
  status: USER_STATUS.OFFLINE,
  lastSeen: new Date(),
  createdAt: new Date()
});

const createUserSession = (userId, username, socketId) => ({
  userId,
  username,
  socketId,
  connectedAt: new Date(),
  lastActivity: new Date()
});

module.exports = {
  USER_ROLES,
  USER_STATUS,
  createUser,
  createUserSession
};