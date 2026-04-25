import type {
  CreateStrokeInput,
  CreateStrokeResponse,
  CreateTextInput,
  CreateTextResponse,
  Stroke,
  WallItem,
  WallResponse,
  WallText,
} from "@/lib/types/wall";
import { DEFAULT_WALL_LIMIT, strokeRowSchema, textRowSchema } from "@/lib/validation/stroke";

type StrokeRow = {
  id: string;
  wall_id: string;
  points: unknown;
  color: string;
  width: number;
  created_at: string;
  client_id: string;
};

type TextRow = {
  id: string;
  wall_id: string;
  text: string;
  position: unknown;
  color: string;
  font_size: number;
  created_at: string;
  client_id: string;
};

export const wallApi = {
  health: "/api/health",
  wall: "/api/wall",
  strokes: "/api/wall/strokes",
  texts: "/api/wall/texts",
} as const;

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function serializeStrokeRow(row: StrokeRow): Stroke {
  const parsed = strokeRowSchema.parse(row);

  return {
    kind: "stroke",
    id: parsed.id,
    wallId: parsed.wall_id,
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
        kind: "stroke",
        id: parsed.data.id,
        wallId: parsed.data.wall_id,
        points: parsed.data.points,
        color: parsed.data.color,
        width: parsed.data.width,
        createdAt: new Date(parsed.data.created_at).toISOString(),
        clientId: parsed.data.client_id,
      },
    ];
  });
}

export function serializeTextRow(row: TextRow): WallText {
  const parsed = textRowSchema.parse(row);

  return {
    kind: "text",
    id: parsed.id,
    wallId: parsed.wall_id,
    text: parsed.text,
    position: parsed.position,
    color: parsed.color,
    fontSize: parsed.font_size,
    createdAt: new Date(parsed.created_at).toISOString(),
    clientId: parsed.client_id,
  };
}

export function serializeTextRows(rows: TextRow[]): WallText[] {
  return rows.flatMap((row) => {
    const parsed = textRowSchema.safeParse(row);

    if (!parsed.success) {
      console.warn("Skipping invalid text row", parsed.error.flatten());
      return [];
    }

    return [
      {
        kind: "text",
        id: parsed.data.id,
        wallId: parsed.data.wall_id,
        text: parsed.data.text,
        position: parsed.data.position,
        color: parsed.data.color,
        fontSize: parsed.data.font_size,
        createdAt: new Date(parsed.data.created_at).toISOString(),
        clientId: parsed.data.client_id,
      },
    ];
  });
}

export function mergeWallItems(strokes: Stroke[], texts: WallText[]): WallItem[] {
  return [...strokes, ...texts].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function toStrokeInsert(input: CreateStrokeInput) {
  return {
    wall_id: input.wallId,
    points: input.points,
    color: input.color,
    width: input.width,
    client_id: input.clientId,
  };
}

export function toTextInsert(input: CreateTextInput) {
  return {
    wall_id: input.wallId,
    text: input.text,
    position: input.position,
    color: input.color,
    font_size: input.fontSize,
    client_id: input.clientId,
  };
}

export async function fetchWall(wallId: CreateStrokeInput["wallId"], limit = DEFAULT_WALL_LIMIT) {
  const response = await fetch(`${wallApi.wall}?limit=${limit}&wallId=${wallId}`, {
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

export async function createText(input: CreateTextInput) {
  const response = await fetch(wallApi.texts, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to save text: ${response.status}`);
  }

  return readJson<CreateTextResponse>(response);
}
