import { beforeEach, describe, expect, it, vi } from "vitest";

const single = vi.fn();
const select = vi.fn(() => ({ single }));
const insert = vi.fn(() => ({ select }));
const from = vi.fn(() => ({ insert }));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from,
  }),
}));

import { POST } from "./route";

describe("POST /api/wall/strokes", () => {
  beforeEach(() => {
    single.mockReset();
    insert.mockClear();
    from.mockClear();
  });

  it("returns 201 for a valid stroke payload", async () => {
    single.mockResolvedValue({
      data: {
        id: "0f7770f1-887d-44c9-af7f-b80ef49264e8",
        points: [
          [0.1, 0.1],
          [0.2, 0.2],
        ],
        color: "#1f1b18",
        width: 4,
        created_at: "2026-04-24T20:00:00.000Z",
        client_id: "anon-123",
      },
      error: null,
    });

    const response = await POST(
      new Request("http://localhost/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
      },
    });
    expect(from).toHaveBeenCalledWith("strokes");
  });

  it("returns 400 for an invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/wall/strokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: [[1.5, 0.5]],
          color: "nope",
          width: 999,
          clientId: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
