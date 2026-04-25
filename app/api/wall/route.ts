import { NextRequest, NextResponse } from "next/server";
import { serializeStrokeRows } from "@/lib/api/wall";
import { getServerSupabase } from "@/lib/supabase/server";
import { wallQuerySchema } from "@/lib/validation/stroke";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const queryResult = wallQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
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

  const { limit, cursor } = queryResult.data;

  try {
    const supabase = getServerSupabase();
    let query = supabase
      .from("strokes")
      .select("id, points, color, width, created_at, client_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch wall strokes", error);
      return NextResponse.json(
        { error: "Unable to load wall strokes right now." },
        { status: 500 },
      );
    }

    const rows = data ?? [];
    const strokes = serializeStrokeRows(rows.slice().reverse());
    const nextCursor =
      rows.length === limit && rows.at(-1)?.created_at
        ? new Date(rows.at(-1)!.created_at).toISOString()
        : null;

    return NextResponse.json(
      { strokes, nextCursor },
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
