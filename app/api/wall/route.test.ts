import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const order = vi.fn(() => ({
  limit,
  lt,
}));
const limit = vi.fn(() => ({
  data: [
    {
      id: "b638333c-b2da-48ae-a1b9-c784460c2af6",
      points: [
        [0.1, 0.1],
        [0.2, 0.2],
      ],
      color: "#1f1b18",
      width: 4,
      created_at: "2026-04-24T20:00:01.000Z",
      client_id: "anon-1",
    },
    {
      id: "bad-row",
      points: ["nope"],
      color: "#1f1b18",
      width: 4,
      created_at: "2026-04-24T20:00:02.000Z",
      client_id: "anon-2",
    },
  ],
  error: null,
}));
const lt = vi.fn(() => ({
  data: [],
  error: null,
}));
const select = vi.fn(() => ({
  order,
}));
const from = vi.fn(() => ({
  select,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from,
  }),
}));

import { GET } from "./route";

describe("GET /api/wall", () => {
  it("returns valid strokes and skips malformed rows", async () => {
    const response = await GET(new NextRequest("http://localhost/api/wall?limit=2"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      strokes: [
        {
          id: "b638333c-b2da-48ae-a1b9-c784460c2af6",
        },
      ],
    });
  });
});
