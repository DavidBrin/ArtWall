export type Point = [number, number];

export const wallIds = ["street", "ideas", "chalkboard"] as const;

export type WallPresetId = (typeof wallIds)[number];

type WallItemBase = {
  id: string;
  wallId: WallPresetId;
  createdAt: string;
  clientId: string;
};

export type Stroke = WallItemBase & {
  kind: "stroke";
  points: Point[];
  color: string;
  width: number;
};

export type WallText = WallItemBase & {
  kind: "text";
  text: string;
  position: Point;
  color: string;
  fontSize: number;
};

export type WallItem = Stroke | WallText;

export type CreateStrokeInput = {
  wallId: WallPresetId;
  points: Point[];
  color: string;
  width: number;
  clientId: string;
};

export type CreateTextInput = {
  wallId: WallPresetId;
  text: string;
  position: Point;
  color: string;
  fontSize: number;
  clientId: string;
};

export type WallResponse = {
  items: WallItem[];
  wallId: WallPresetId;
  nextCursor: string | null;
};

export type CreateStrokeResponse = {
  stroke: Stroke;
};

export type CreateTextResponse = {
  text: WallText;
};

export type HealthResponse = {
  ok: true;
};
