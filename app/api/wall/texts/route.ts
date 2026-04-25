import { NextResponse } from "next/server";
import { serializeTextRow, toTextInsert } from "@/lib/api/wall";
import { getServerSupabase } from "@/lib/supabase/server";
import { createTextSchema } from "@/lib/validation/stroke";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const payloadResult = createTextSchema.safeParse(json);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        error: "Invalid text payload.",
        issues: payloadResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("wall_texts")
      .insert(toTextInsert(payloadResult.data))
      .select("id, wall_id, text, position, color, font_size, created_at, client_id")
      .single();

    if (error) {
      console.error("Failed to persist wall text", error);
      return NextResponse.json(
        { error: "Unable to save the text right now." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { text: serializeTextRow(data) },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Text route configuration error", error);
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 },
    );
  }
}
