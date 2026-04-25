import { NextResponse } from "next/server";
import { serializeStrokeRow } from "@/lib/api/wall";
import { getServerSupabase } from "@/lib/supabase/server";
import { createStrokeSchema } from "@/lib/validation/stroke";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const payloadResult = createStrokeSchema.safeParse(json);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        error: "Invalid stroke payload.",
        issues: payloadResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getServerSupabase();
    const { points, color, width, clientId } = payloadResult.data;
    const { data, error } = await supabase
      .from("strokes")
      .insert({
        points,
        color,
        width,
        client_id: clientId,
      })
      .select("id, points, color, width, created_at, client_id")
      .single();

    if (error) {
      console.error("Failed to persist stroke", error);
      return NextResponse.json(
        { error: "Unable to save the stroke right now." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { stroke: serializeStrokeRow(data) },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Stroke route configuration error", error);
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 },
    );
  }
}

