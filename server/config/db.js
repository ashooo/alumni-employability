const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

let PrismaClient;
let prismaClientLoadError = null;
let prisma = null;

try {
  ({ PrismaClient } = require('../generated/client'));
} catch (error) {
  prismaClientLoadError = error;
}

const getDatabaseSetupStatus = () => {
  if (prismaClientLoadError || !PrismaClient) {
    return {
      ready: false,
      message: 'Run `npm run prisma:generate` in `server/` to generate the Prisma client.'
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      ready: false,
      message: 'Set `DATABASE_URL` in `server/.env` or export it before starting the server.'
    };
  }

  return {
    ready: true,
    message: null
  };
};

const getPrisma = () => {
  const status = getDatabaseSetupStatus();

  if (!status.ready) {
    throw new Error(status.message);
  }

  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  return prisma;
};

module.exports = {
  getPrisma,
  getDatabaseSetupStatus,
  // Temporary aliases for backward compatibility during refactor
  getRefactorPrisma: getPrisma,
  getRefactorSetupStatus: getDatabaseSetupStatus
};
