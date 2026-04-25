export type Point = [number, number];

export type Stroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  createdAt: string;
  clientId: string;
};

export type CreateStrokeInput = {
  points: Point[];
  color: string;
  width: number;
  clientId: string;
};

export type WallResponse = {
  strokes: Stroke[];
  nextCursor: string | null;
};

export type CreateStrokeResponse = {
  stroke: Stroke;
};

export type HealthResponse = {
  ok: true;
};

