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

let RefactorPrismaClient;
let refactorClientLoadError = null;
let refactorPrisma = null;

try {
  ({ PrismaClient: RefactorPrismaClient } = require('../generated/refactor-client'));
} catch (error) {
  refactorClientLoadError = error;
}

const getRefactorSetupStatus = () => {
  if (refactorClientLoadError || !RefactorPrismaClient) {
    return {
      ready: false,
      message: 'Run `npm run prisma:refactor:generate` in `server/` to generate the refactor Prisma client.'
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

const getRefactorPrisma = () => {
  const status = getRefactorSetupStatus();

  if (!status.ready) {
    throw new Error(status.message);
  }

  if (!refactorPrisma) {
    refactorPrisma = new RefactorPrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_REFACTOR
        }
      }
    });
  }

  return refactorPrisma;
};

module.exports = {
  getRefactorPrisma,
  getRefactorSetupStatus
};
