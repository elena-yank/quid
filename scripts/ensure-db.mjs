#!/usr/bin/env node
/**
 * Create the database named in DATABASE_URL when it does not exist yet.
 * Connects to the maintenance database `postgres` on the same server.
 */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("[ensure-db] DATABASE_URL not set — skipping.");
  process.exit(0);
}

const url = new URL(databaseUrl);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(dbName)) {
  console.error(`[ensure-db] refusing to create database with name ${JSON.stringify(dbName)}`);
  process.exit(1);
}

const admin = new URL(databaseUrl);
admin.pathname = "/postgres";

const pool = new pg.Pool({ connectionString: admin.toString(), max: 1 });
try {
  const existing = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (existing.rowCount) {
    console.log(`[ensure-db] database ${dbName} already exists.`);
  } else {
    await pool.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[ensure-db] created database ${dbName}.`);
  }
} finally {
  await pool.end();
}
