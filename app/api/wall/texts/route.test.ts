import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertTextRow } = vi.hoisted(() => ({ insertTextRow: vi.fn() }));

vi.mock("@/lib/db/server", () => ({
  insertTextRow,
}));

import { POST } from "./route";

describe("POST /api/wall/texts", () => {
  beforeEach(() => {
    insertTextRow.mockReset();
  });

  it("returns 201 for a valid text payload", async () => {
    insertTextRow.mockResolvedValue({
      id: "e7afb1a2-d6e0-4927-80b7-b2f204dbc3d3",
      wall_id: "chalkboard",
      text: "chalk club",
      position: [0.25, 0.35],
      color: "#f2ecdf",
      font_size: 32,
      created_at: "2026-04-24T20:00:00.000Z",
      client_id: "anon-123",
    });

    const response = await POST(
      new Request("http://localhost/api/wall/texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: "chalkboard",
          text: "chalk club",
          position: [0.25, 0.35],
          color: "#f2ecdf",
          fontSize: 32,
          clientId: "anon-123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      text: {
        id: "e7afb1a2-d6e0-4927-80b7-b2f204dbc3d3",
        wallId: "chalkboard",
      },
    });
    expect(insertTextRow).toHaveBeenCalledWith({
      wall_id: "chalkboard",
      text: "chalk club",
      position: [0.25, 0.35],
      color: "#f2ecdf",
      font_size: 32,
      client_id: "anon-123",
    });
  });

  it("returns 400 for an invalid text payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/wall/texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: "chalkboard",
          text: "",
          position: [1.5, 0.2],
          color: "nope",
          fontSize: 200,
          clientId: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(insertTextRow).not.toHaveBeenCalled();
  });
});
