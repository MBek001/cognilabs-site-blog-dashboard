import { NextResponse } from "next/server";
import { createGa4Client } from "@/lib/ga4";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { client, property } = createGa4Client();

    const [overviewReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    });

    const [eventReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "page_view",
            matchType: "EXACT",
          },
        },
      },
      limit: 1,
    });

    const overviewRow = overviewReport.rows?.[0];
    const eventRow = eventReport.rows?.[0];

    return NextResponse.json({
      ok: true,
      data: {
        range: "last_7_days",
        activeUsers: Number(overviewRow?.metricValues?.[0]?.value || 0),
        screenPageViews: Number(overviewRow?.metricValues?.[1]?.value || 0),
        sampleEvent: {
          eventName: eventRow?.dimensionValues?.[0]?.value || "page_view",
          eventCount: Number(eventRow?.metricValues?.[0]?.value || 0),
        },
      },
    });
  } catch (error) {
    console.error("[api/analytics] Failed to fetch GA4 report", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch analytics data",
        details:
          process.env.NODE_ENV === "development"
            ? String(error?.message || error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
