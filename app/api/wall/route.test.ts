import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/server", () => ({
  listStrokeRows: vi.fn(async () => [
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
      is_eraser: false,
    },
    {
      id: "0d2c5e0a-3f6b-4c1d-9a8e-7b6f5d4c3b2a",
      wall_id: "street",
      points: [
        [0.3, 0.3],
        [0.4, 0.4],
      ],
      color: "#d1d0cc",
      width: 18,
      created_at: "2026-04-24T20:00:01.500Z",
      client_id: "anon-1",
      is_eraser: true,
    },
    {
      // Written by a client that predates the erase flag: wall color, flag defaulted to false.
      id: "5f4e3d2c-1b0a-4f9e-8d7c-6b5a4f3e2d1c",
      wall_id: "street",
      points: [
        [0.5, 0.5],
        [0.6, 0.6],
      ],
      color: "#d1d0cc",
      width: 18,
      created_at: "2026-04-24T20:00:01.750Z",
      client_id: "anon-legacy",
      is_eraser: false,
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
  ]),
  listTextRows: vi.fn(async () => [
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
  ]),
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
          erase: false,
        },
        {
          id: "0d2c5e0a-3f6b-4c1d-9a8e-7b6f5d4c3b2a",
          kind: "stroke",
          erase: true,
        },
        {
          id: "5f4e3d2c-1b0a-4f9e-8d7c-6b5a4f3e2d1c",
          kind: "stroke",
          erase: true,
        },
        {
          id: "df260f32-72c7-41c0-ac7d-b5ec80d94f44",
          kind: "text",
        },
      ],
    });
  });
});
