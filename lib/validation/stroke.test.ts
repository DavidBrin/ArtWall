import { describe, expect, it } from "vitest";
import { createStrokeSchema, wallQuerySchema } from "./stroke";

describe("createStrokeSchema", () => {
  it("accepts a valid stroke payload", () => {
    const result = createStrokeSchema.safeParse({
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
      color: "#1f1b18",
      width: 4,
      clientId: "anon-123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects points outside normalized bounds", () => {
    const result = createStrokeSchema.safeParse({
      points: [
        [0.1, 0.1],
        [1.2, 0.2],
      ],
      color: "#1f1b18",
      width: 4,
      clientId: "anon-123",
    });

    expect(result.success).toBe(false);
  });
});

describe("wallQuerySchema", () => {
  it("provides the default wall limit", () => {
    const result = wallQuerySchema.parse({});
    expect(result.limit).toBe(5000);
    expect(result.cursor).toBeUndefined();
  });
});
