import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertStrokeRow } = vi.hoisted(() => ({ insertStrokeRow: vi.fn() }));

vi.mock("@/lib/db/server", () => ({
  insertStrokeRow,
}));

import { POST } from "./route";

describe("POST /api/wall/strokes", () => {
  beforeEach(() => {
    insertStrokeRow.mockReset();
  });

  it("returns 201 for a valid stroke payload", async () => {
    insertStrokeRow.mockResolvedValue({
      id: "0f7770f1-887d-44c9-af7f-b80ef49264e8",
      wall_id: "street",
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
      color: "#1f1b18",
      width: 4,
      created_at: "2026-04-24T20:00:00.000Z",
      client_id: "anon-123",
    });

    const response = await POST(
      new Request("http://localhost/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: "street",
          points: [
            [0.1, 0.1],
            [0.2, 0.2],
          ],
          color: "#1f1b18",
          width: 4,
          clientId: "anon-123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      stroke: {
        id: "0f7770f1-887d-44c9-af7f-b80ef49264e8",
        wallId: "street",
      },
    });
    expect(insertStrokeRow).toHaveBeenCalledWith({
      wall_id: "street",
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
      color: "#1f1b18",
      width: 4,
      client_id: "anon-123",
      is_eraser: false,
    });
  });

  it("persists eraser strokes as destination-out marks", async () => {
    insertStrokeRow.mockResolvedValue({
      id: "1a7770f1-887d-44c9-af7f-b80ef49264e8",
      wall_id: "street",
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
      color: "#d1d0cc",
      width: 18,
      created_at: "2026-04-24T20:00:00.000Z",
      client_id: "anon-123",
      is_eraser: true,
    });

    const response = await POST(
      new Request("http://localhost/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: "street",
          points: [
            [0.1, 0.1],
            [0.2, 0.2],
          ],
          color: "#d1d0cc",
          width: 18,
          erase: true,
          clientId: "anon-123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      stroke: {
        id: "1a7770f1-887d-44c9-af7f-b80ef49264e8",
        erase: true,
      },
    });
    expect(insertStrokeRow).toHaveBeenCalledWith({
      wall_id: "street",
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
      color: "#d1d0cc",
      width: 18,
      client_id: "anon-123",
      is_eraser: true,
    });
  });

  it("returns 400 for an invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallId: "street",
          points: [[1.5, 0.5]],
          color: "nope",
          width: 999,
          clientId: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(insertStrokeRow).not.toHaveBeenCalled();
  });
});
