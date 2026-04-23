const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const refactorEnvPath = path.resolve(__dirname, '../.env.refactor');
const refactorExamplePath = path.resolve(__dirname, '../.env.refactor.example');

if (fs.existsSync(refactorEnvPath)) {
  dotenv.config({ path: refactorEnvPath, override: false });
} else if (fs.existsSync(refactorExamplePath)) {
  dotenv.config({ path: refactorExamplePath, override: false });
}

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

  if (!process.env.DATABASE_URL_REFACTOR) {
    return {
      ready: false,
      message: 'Set `DATABASE_URL_REFACTOR` in `server/.env.refactor` or export it before starting the server.'
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
          url: process.env.DATABASE_URL_REFACTOR
        }
      }
    });
  }

  return prisma;
};

module.exports = {
  getPrisma,
  getDatabaseSetupStatus,
  // Backward-compatible aliases while refactor-era controller names are still in place.
  getRefactorPrisma: getPrisma,
  getRefactorSetupStatus: getDatabaseSetupStatus
};
