import { NextRequest, NextResponse } from "next/server";
import { mergeWallItems, serializeStrokeRows, serializeTextRows } from "@/lib/api/wall";
import { listStrokeRows, listTextRows } from "@/lib/db/server";
import { wallQuerySchema } from "@/lib/validation/stroke";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const queryResult = wallQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    wallId: request.nextUrl.searchParams.get("wallId") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        issues: queryResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { limit, cursor, wallId } = queryResult.data;

  try {
    const [strokeRows, textRows] = await Promise.all([
      listStrokeRows(wallId, limit, cursor),
      listTextRows(wallId, limit, cursor),
    ]);

    const items = mergeWallItems(
      serializeStrokeRows(strokeRows.slice().reverse()),
      serializeTextRows(textRows.slice().reverse()),
    );

    return NextResponse.json(
      { items, wallId, nextCursor: null },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Wall route configuration error", error);
    return NextResponse.json(
      { error: "Unable to load wall artwork right now." },
      { status: 500 },
    );
  }
}
