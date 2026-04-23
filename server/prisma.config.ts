import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv();

for (const envPath of [".env.refactor", ".env.refactor.example"]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_REFACTOR"],
  },
});
