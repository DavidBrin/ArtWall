/**
 * Neon Postgres client for the Art Wall.
 *
 * The original deployment used Supabase; that project no longer exists.
 * The public API still goes through Next.js route handlers. Realtime is
 * polling from the client rather than a Supabase channel.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;

export function getSql(): Sql {
  if (sql) {
    return sql;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing DATABASE_URL.");
  }

  sql = neon(url);
  return sql;
}

export type StrokeRow = {
  id: string;
  wall_id: string;
  points: unknown;
  color: string;
  width: number;
  created_at: string;
  client_id: string;
};

export type TextRow = {
  id: string;
  wall_id: string;
  text: string;
  position: unknown;
  color: string;
  font_size: number;
  created_at: string;
  client_id: string;
};

export async function listStrokeRows(wallId: string, limit: number, cursor?: string): Promise<StrokeRow[]> {
  const db = getSql();
  if (cursor) {
    return db`
      select id, wall_id, points, color, width, created_at, client_id
      from strokes
      where wall_id = ${wallId} and created_at < ${cursor}::timestamptz
      order by created_at desc
      limit ${limit}
    ` as Promise<StrokeRow[]>;
  }

  return db`
    select id, wall_id, points, color, width, created_at, client_id
    from strokes
    where wall_id = ${wallId}
    order by created_at desc
    limit ${limit}
  ` as Promise<StrokeRow[]>;
}

export async function listTextRows(wallId: string, limit: number, cursor?: string): Promise<TextRow[]> {
  const db = getSql();
  if (cursor) {
    return db`
      select id, wall_id, text, position, color, font_size, created_at, client_id
      from wall_texts
      where wall_id = ${wallId} and created_at < ${cursor}::timestamptz
      order by created_at desc
      limit ${limit}
    ` as Promise<TextRow[]>;
  }

  return db`
    select id, wall_id, text, position, color, font_size, created_at, client_id
    from wall_texts
    where wall_id = ${wallId}
    order by created_at desc
    limit ${limit}
  ` as Promise<TextRow[]>;
}

export async function insertStrokeRow(row: {
  wall_id: string;
  points: unknown;
  color: string;
  width: number;
  client_id: string;
}): Promise<StrokeRow> {
  const db = getSql();
  const rows = (await db`
    insert into strokes (wall_id, points, color, width, client_id)
    values (${row.wall_id}, ${JSON.stringify(row.points)}::jsonb, ${row.color}, ${row.width}, ${row.client_id})
    returning id, wall_id, points, color, width, created_at, client_id
  `) as StrokeRow[];

  if (!rows[0]) {
    throw new Error("Stroke insert returned no row.");
  }

  return rows[0];
}

export async function insertTextRow(row: {
  wall_id: string;
  text: string;
  position: unknown;
  color: string;
  font_size: number;
  client_id: string;
}): Promise<TextRow> {
  const db = getSql();
  const rows = (await db`
    insert into wall_texts (wall_id, text, position, color, font_size, client_id)
    values (${row.wall_id}, ${row.text}, ${JSON.stringify(row.position)}::jsonb, ${row.color}, ${row.font_size}, ${row.client_id})
    returning id, wall_id, text, position, color, font_size, created_at, client_id
  `) as TextRow[];

  if (!rows[0]) {
    throw new Error("Text insert returned no row.");
  }

  return rows[0];
}

export async function pingDatabase(): Promise<void> {
  const db = getSql();
  await db`select 1`;
}
