import { NextRequest, NextResponse } from "next/server";
import { mergeWallItems, serializeStrokeRows, serializeTextRows } from "@/lib/api/wall";
import { getServerSupabase } from "@/lib/supabase/server";
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
    const supabase = getServerSupabase();
    let strokesQuery = supabase
      .from("strokes")
      .select("id, wall_id, points, color, width, created_at, client_id")
      .eq("wall_id", wallId)
      .order("created_at", { ascending: false })
      .limit(limit);

    let textsQuery = supabase
      .from("wall_texts")
      .select("id, wall_id, text, position, color, font_size, created_at, client_id")
      .eq("wall_id", wallId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      strokesQuery = strokesQuery.lt("created_at", cursor);
      textsQuery = textsQuery.lt("created_at", cursor);
    }

    const [
      { data: strokeData, error: strokeError },
      { data: textData, error: textError },
    ] = await Promise.all([strokesQuery, textsQuery]);

    if (strokeError || textError) {
      console.error("Failed to fetch wall items", strokeError ?? textError);
      return NextResponse.json(
        { error: "Unable to load wall artwork right now." },
        { status: 500 },
      );
    }

    const strokeRows = strokeData ?? [];
    const textRows = textData ?? [];
    const items = mergeWallItems(
      serializeStrokeRows(strokeRows.slice().reverse()),
      serializeTextRows(textRows.slice().reverse()),
    );
    const nextCursor = null;

    return NextResponse.json(
      { items, wallId, nextCursor },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Wall route configuration error", error);
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 },
    );
  }
}
