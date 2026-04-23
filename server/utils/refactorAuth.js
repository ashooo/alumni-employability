const bcrypt = require('bcrypt');

const PLACEHOLDER_PASSWORD_PREFIX = '__REFRACTOR_ALUMNI_PLACEHOLDER__';

const normalizeUserRole = (role) => {
  switch (String(role || '').trim().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'superadmin':
      return 'superadmin';
    default:
      return 'alumni';
  }
};

const normalizeUserRoleEnum = (role) => {
  switch (normalizeUserRole(role)) {
    case 'admin':
      return 'ADMIN';
    case 'superadmin':
      return 'SUPERADMIN';
    default:
      return 'ALUMNI';
  }
};

const getPlaceholderPasswordSeed = (username) =>
  `${PLACEHOLDER_PASSWORD_PREFIX}:${String(username || '').trim()}`;

const createPlaceholderPasswordHash = async (username, saltRounds = 10) => {
  return bcrypt.hash(getPlaceholderPasswordSeed(username), saltRounds);
};

const isPlaceholderPasswordHash = async (username, passwordHash) => {
  if (!username || !passwordHash) {
    return false;
  }

  try {
    return await bcrypt.compare(getPlaceholderPasswordSeed(username), passwordHash);
  } catch (error) {
    return false;
  }
};

module.exports = {
  normalizeUserRole,
  normalizeUserRoleEnum,
  createPlaceholderPasswordHash,
  isPlaceholderPasswordHash
};
