import type { CreateStrokeInput, CreateStrokeResponse, Stroke, WallResponse } from "@/lib/types/wall";
import { DEFAULT_WALL_LIMIT, strokeRowSchema } from "@/lib/validation/stroke";

type StrokeRow = {
  id: string;
  points: unknown;
  color: string;
  width: number;
  created_at: string;
  client_id: string;
};

export const wallApi = {
  health: "/api/health",
  wall: "/api/wall",
  strokes: "/api/wall/strokes",
} as const;

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function serializeStrokeRow(row: StrokeRow): Stroke {
  const parsed = strokeRowSchema.parse(row);

  return {
    id: parsed.id,
    points: parsed.points,
    color: parsed.color,
    width: parsed.width,
    createdAt: new Date(parsed.created_at).toISOString(),
    clientId: parsed.client_id,
  };
}

export function serializeStrokeRows(rows: StrokeRow[]): Stroke[] {
  return rows.flatMap((row) => {
    const parsed = strokeRowSchema.safeParse(row);

    if (!parsed.success) {
      console.warn("Skipping invalid stroke row", parsed.error.flatten());
      return [];
    }

    return [
      {
        id: parsed.data.id,
        points: parsed.data.points,
        color: parsed.data.color,
        width: parsed.data.width,
        createdAt: new Date(parsed.data.created_at).toISOString(),
        clientId: parsed.data.client_id,
      },
    ];
  });
}

export function toStrokeInsert(input: CreateStrokeInput) {
  return {
    points: input.points,
    color: input.color,
    width: input.width,
    client_id: input.clientId,
  };
}

export async function fetchWall(limit = DEFAULT_WALL_LIMIT) {
  const response = await fetch(`${wallApi.wall}?limit=${limit}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch wall: ${response.status}`);
  }

  return readJson<WallResponse>(response);
}

export async function createStroke(input: CreateStrokeInput) {
  const response = await fetch(wallApi.strokes, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to save stroke: ${response.status}`);
  }

  return readJson<CreateStrokeResponse>(response);
}
