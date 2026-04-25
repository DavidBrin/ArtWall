import { z } from "zod";

export const DEFAULT_WALL_LIMIT = 5000;
export const MAX_WALL_LIMIT = 10000;
export const MAX_STROKE_POINTS = 2048;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 24;

export const pointSchema = z.tuple([
  z.number().finite().min(0).max(1),
  z.number().finite().min(0).max(1),
]);

export const strokePointsSchema = z
  .array(pointSchema)
  .min(2, "A stroke needs at least two sampled points.")
  .max(MAX_STROKE_POINTS, `A stroke can include at most ${MAX_STROKE_POINTS} points.`);

export const colorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a 3-digit or 6-digit hex value.");

export const widthSchema = z
  .number()
  .int("Width must be an integer.")
  .min(MIN_STROKE_WIDTH)
  .max(MAX_STROKE_WIDTH);

export const clientIdSchema = z.string().trim().min(1).max(128);

export const createStrokeSchema = z.object({
  points: strokePointsSchema,
  color: colorSchema,
  width: widthSchema,
  clientId: clientIdSchema,
});

export const wallQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_WALL_LIMIT).default(DEFAULT_WALL_LIMIT),
  cursor: z.string().datetime({ offset: true }).optional(),
});

export const strokeRowSchema = z.object({
  id: z.string().uuid(),
  points: strokePointsSchema,
  color: colorSchema,
  width: widthSchema,
  created_at: z.union([z.string(), z.date()]),
  client_id: clientIdSchema,
});
