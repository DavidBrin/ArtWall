#!/usr/bin/env node
/**
 * Apply schema.sql to Neon.
 *
 *   DATABASE_URL=... node --experimental-strip-types scripts/db-push.ts
 */

import { readFileSync } from "node:fs";

const SCHEMA_SQL = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

interface NeonClientLike {
  query(sql: string): Promise<unknown>;
  release(): void;
}

interface NeonPoolLike {
  connect(): Promise<NeonClientLike>;
  end(): Promise<void>;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("db:push requires DATABASE_URL");
  }
  return url;
}

async function apply(connectionString: string): Promise<void> {
  const neon = (await import("@neondatabase/serverless")) as unknown as {
    Pool: new (config: { connectionString: string }) => NeonPoolLike;
  };

  const pool = new neon.Pool({ connectionString });
  try {
    const client = await pool.connect();
    try {
      await client.query(SCHEMA_SQL);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  process.stdout.write("Applying Art Wall schema…\n");
  const started = Date.now();
  await apply(databaseUrl());
  process.stdout.write(`Schema applied in ${Date.now() - started}ms.\n`);
}

await main();
