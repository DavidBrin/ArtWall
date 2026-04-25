import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const from = vi.fn((table: string) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() =>
          table === "strokes"
            ? {
                data: [
                  {
                    id: "b638333c-b2da-48ae-a1b9-c784460c2af6",
                    wall_id: "street",
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
                    wall_id: "street",
                    points: ["nope"],
                    color: "#1f1b18",
                    width: 4,
                    created_at: "2026-04-24T20:00:02.000Z",
                    client_id: "anon-2",
                  },
                ],
                error: null,
              }
            : {
                data: [
                  {
                    id: "df260f32-72c7-41c0-ac7d-b5ec80d94f44",
                    wall_id: "street",
                    text: "hello wall",
                    position: [0.5, 0.4],
                    color: "#25586e",
                    font_size: 28,
                    created_at: "2026-04-24T20:00:03.000Z",
                    client_id: "anon-3",
                  },
                ],
                error: null,
              }),
        lt: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from,
  }),
}));

import { GET } from "./route";

describe("GET /api/wall", () => {
  it("returns valid wall items for the requested wall and skips malformed rows", async () => {
    const response = await GET(new NextRequest("http://localhost/api/wall?limit=2&wallId=street"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      wallId: "street",
      items: [
        {
          id: "b638333c-b2da-48ae-a1b9-c784460c2af6",
          kind: "stroke",
        },
        {
          id: "df260f32-72c7-41c0-ac7d-b5ec80d94f44",
          kind: "text",
        },
      ],
    });
  });
});
