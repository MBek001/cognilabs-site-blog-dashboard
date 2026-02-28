import { NextResponse } from "next/server";
import { createGa4Client } from "@/lib/ga4";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { client, property } = createGa4Client();

    const [realtimeReport] = await client.runRealtimeReport({
      property,
      metrics: [{ name: "activeUsers" }],
    });

    const row = realtimeReport.rows?.[0];

    return NextResponse.json({
      ok: true,
      data: {
        activeUsersLast30Minutes: Number(row?.metricValues?.[0]?.value || 0),
      },
    });
  } catch (error) {
    console.error("[api/analytics/realtime] Failed to fetch realtime GA4", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch realtime analytics data",
        details:
          process.env.NODE_ENV === "development"
            ? String(error?.message || error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
