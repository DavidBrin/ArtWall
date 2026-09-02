import { NextResponse } from "next/server";
import { serializeStrokeRow, toStrokeInsert } from "@/lib/api/wall";
import { insertStrokeRow } from "@/lib/db/server";
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
    const insert = toStrokeInsert(payloadResult.data);
    const row = await insertStrokeRow(insert);
    return NextResponse.json(
      { stroke: serializeStrokeRow(row) },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to persist stroke", error);
    return NextResponse.json(
      { error: "Unable to save the stroke right now." },
      { status: 500 },
    );
  }
}
