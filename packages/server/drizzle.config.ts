import { defineConfig } from "drizzle-kit";

// Default to Postgres if no environment variable is provided
const dialect =
  (process.env.DB_DIALECT as "postgresql" | "sqlite") || "postgresql";

export default defineConfig({
  dialect: dialect,
  // Dynamically point to the correct schema file we just created
  schema:
    dialect === "postgresql"
      ? "./src/database/schema/pg.ts"
      : "./src/database/schema/sqlite.ts",
  // Isolate the generated SQL migrations into distinct folders
  out: dialect === "postgresql" ? "./migrations/pg" : "./migrations/sqlite",
  dbCredentials: {
    // Cloudflare D1 will use a local SQLite file for generation
    url:
      process.env.DATABASE_URL ||
      (dialect === "sqlite"
        ? ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite"
        : ""),
  },
  migrations: {
    // Prefix the migrations table so it does not collide with the user's app migrations
    table: "semaphore_pay_migrations",
    schema: dialect === "postgresql" ? "public" : undefined,
  },
});
