import { describe, expect, it } from "vitest";
import { createStrokeSchema, createTextSchema, wallQuerySchema } from "./stroke";

describe("createStrokeSchema", () => {
  it("accepts a valid stroke payload", () => {
    const result = createStrokeSchema.safeParse({
      wallId: "street",
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
      wallId: "street",
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

describe("createTextSchema", () => {
  it("accepts a valid text payload", () => {
    const result = createTextSchema.safeParse({
      wallId: "chalkboard",
      text: "hello world",
      position: [0.5, 0.4],
      color: "#f2ecdf",
      fontSize: 28,
      clientId: "anon-456",
    });

    expect(result.success).toBe(true);
  });
});

describe("wallQuerySchema", () => {
  it("provides the default wall limit and wall id", () => {
    const result = wallQuerySchema.parse({});
    expect(result.limit).toBe(5000);
    expect(result.cursor).toBeUndefined();
    expect(result.wallId).toBe("street");
  });
});
