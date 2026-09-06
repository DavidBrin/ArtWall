import { z } from "zod";
import { wallIds } from "@/lib/types/wall";

export const DEFAULT_WALL_LIMIT = 5000;
export const MAX_WALL_LIMIT = 10000;
export const MAX_STROKE_POINTS = 2048;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 24;
export const MIN_TEXT_SIZE = 14;
export const MAX_TEXT_SIZE = 96;
export const MAX_TEXT_LENGTH = 280;

export const pointSchema = z.tuple([
  z.number().finite().min(0).max(1),
  z.number().finite().min(0).max(1),
]);

export const wallIdSchema = z.enum(wallIds);

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

export const fontSizeSchema = z
  .number()
  .int("Text size must be an integer.")
  .min(MIN_TEXT_SIZE)
  .max(MAX_TEXT_SIZE);

export const clientIdSchema = z.string().trim().min(1).max(128);
export const textSchema = z.string().trim().min(1).max(MAX_TEXT_LENGTH);

export const createStrokeSchema = z.object({
  wallId: wallIdSchema,
  points: strokePointsSchema,
  color: colorSchema,
  width: widthSchema,
  clientId: clientIdSchema,
  erase: z.boolean().optional().default(false),
});

export const createTextSchema = z.object({
  wallId: wallIdSchema,
  text: textSchema,
  position: pointSchema,
  color: colorSchema,
  fontSize: fontSizeSchema,
  clientId: clientIdSchema,
});

export const wallQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_WALL_LIMIT).default(DEFAULT_WALL_LIMIT),
  cursor: z.string().datetime({ offset: true }).optional(),
  wallId: wallIdSchema.default("street"),
});

export const strokeRowSchema = z.object({
  id: z.string().uuid(),
  wall_id: wallIdSchema,
  points: strokePointsSchema,
  color: colorSchema,
  width: widthSchema,
  created_at: z.union([z.string(), z.date()]),
  client_id: clientIdSchema,
  is_eraser: z.boolean().optional().default(false),
});

export const textRowSchema = z.object({
  id: z.string().uuid(),
  wall_id: wallIdSchema,
  text: textSchema,
  position: pointSchema,
  color: colorSchema,
  font_size: fontSizeSchema,
  created_at: z.union([z.string(), z.date()]),
  client_id: clientIdSchema,
});
