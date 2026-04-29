import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  seed: "node prisma/seed.js",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
