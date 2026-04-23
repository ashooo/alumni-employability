import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const LEGACY_SCHEMA_PATH = "prisma/schema.prisma";
const REFACTOR_SCHEMA_PATH = "prisma/schema.refactor.prisma";

const normalizeArgPath = (value?: string | null) =>
  value ? value.replace(/\\/g, "/") : null;

const readCliArgValue = (flag: string) => {
  const flagIndex = process.argv.indexOf(flag);

  if (flagIndex === -1 || flagIndex + 1 >= process.argv.length) {
    return null;
  }

  return normalizeArgPath(process.argv[flagIndex + 1]);
};

const requestedSchemaPath = readCliArgValue("--schema");
const useRefactorSchema =
  requestedSchemaPath === REFACTOR_SCHEMA_PATH ||
  requestedSchemaPath?.endsWith("/schema.refactor.prisma") ||
  requestedSchemaPath?.endsWith("schema.refactor.prisma");

loadEnv();

if (useRefactorSchema) {
  for (const envPath of [".env.refactor", ".env.refactor.example"]) {
    if (existsSync(envPath)) {
      loadEnv({ path: envPath, override: false });
    }
  }
}

export default defineConfig({
  schema: useRefactorSchema ? REFACTOR_SCHEMA_PATH : LEGACY_SCHEMA_PATH,
  migrations: {
    path: useRefactorSchema ? "prisma/migrations-refactor" : "prisma/migrations",
  },
  datasource: {
    url: useRefactorSchema
      ? process.env["DATABASE_URL_REFACTOR"]
      : process.env["DATABASE_URL"],
  },
});
