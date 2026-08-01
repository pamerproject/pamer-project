import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrasi pakai DIRECT_URL (koneksi direct Neon, tanpa -pooler) karena
    // DDL seperti CREATE TYPE/ALTER TABLE tidak aman lewat pooled connection
    // (PgBouncer transaction mode: masalah advisory lock & prepared statement).
    // Runtime aplikasi tetap pakai DATABASE_URL (pooled) via adapter Neon.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
