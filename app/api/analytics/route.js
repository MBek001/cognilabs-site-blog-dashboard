import { NextResponse } from "next/server";
import { createGa4Client } from "@/lib/ga4";

export const runtime = "nodejs";

const PAGE_DEFINITIONS = [
  { key: "main", label: "Main Page", path: "/" },
  { key: "about", label: "About Us Page", path: "/about-us" },
  { key: "careers", label: "Careers Page", path: "/careers" },
  { key: "services", label: "Services Page", path: "/services" },
  { key: "portfolio", label: "Portfolio Page", path: "/portfolio" },
  { key: "insights", label: "Insights Page", path: "/insights" },
];

const LOCALE_PREFIXES = ["en", "ru", "uz"];

const DIMENSION_FALLBACK = "(not set)";

function normalizePath(path = "") {
  if (!path) return "/";
  const trimmed = path === "/" ? "/" : path.endsWith("/") ? path.slice(0, -1) : path;
  const parts = trimmed.split("/").filter(Boolean);

  if (parts.length === 0) return "/";

  if (LOCALE_PREFIXES.includes(parts[0])) {
    const localizedPath = `/${parts.slice(1).join("/")}`;
    return localizedPath === "/" || localizedPath === "" ? "/" : localizedPath;
  }

  return trimmed;
}

function buildExactPathFilters(path) {
  if (path === "/") {
    return ["/", ...LOCALE_PREFIXES.map((locale) => `/${locale}`)];
  }

  return [path, ...LOCALE_PREFIXES.map((locale) => `/${locale}${path}`)];
}

function parseRequestedRange(requestUrl) {
  const url = new URL(requestUrl);
  const preset = url.searchParams.get("range") || "30d";
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");

  const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

  if (preset === "7d") {
    return { preset, startDate: "7daysAgo", endDate: "today" };
  }

  if (
    preset === "custom" &&
    isIsoDate(startDateParam) &&
    isIsoDate(endDateParam)
  ) {
    return { preset, startDate: startDateParam, endDate: endDateParam };
  }

  return { preset: "30d", startDate: "30daysAgo", endDate: "today" };
}

function toDimensionValue(row, index) {
  const value = row?.dimensionValues?.[index]?.value;
  return value && value.length > 0 ? value : DIMENSION_FALLBACK;
}

function mapInteractionRows(rows = [], type) {
  const keyDimensionIndex = type === "button_click" ? 1 : 2;

  const groupedByKey = {};
  const groupedByLocale = {};
  const groupedByPagePath = {};
  const groupedByDate = {};

  const mappedRows = rows.map((row) => {
    const eventName = toDimensionValue(row, 0);
    const keyValue = toDimensionValue(row, keyDimensionIndex);
    const locale = toDimensionValue(row, 3);
    const pagePath = normalizePath(toDimensionValue(row, 4));
    const date = toDimensionValue(row, 5);
    const eventCount = Number(row?.metricValues?.[0]?.value || 0);

    groupedByKey[keyValue] = (groupedByKey[keyValue] || 0) + eventCount;
    groupedByLocale[locale] = (groupedByLocale[locale] || 0) + eventCount;
    groupedByPagePath[pagePath] = (groupedByPagePath[pagePath] || 0) + eventCount;
    groupedByDate[date] = (groupedByDate[date] || 0) + eventCount;

    if (type === "button_click") {
      return {
        eventName,
        elementId: keyValue,
        locale,
        pagePath,
        date,
        eventCount,
      };
    }

    return {
      eventName,
      formId: keyValue,
      locale,
      pagePath,
      date,
      eventCount,
    };
  });

  const total = mappedRows.reduce((sum, item) => sum + item.eventCount, 0);

  return {
    total,
    rows: mappedRows,
    [type === "button_click" ? "byElementId" : "byFormId"]: Object.entries(
      groupedByKey
    ).map(([id, eventCount]) => ({
      id,
      eventCount,
    })),
    byLocale: Object.entries(groupedByLocale).map(([locale, eventCount]) => ({
      locale,
      eventCount,
    })),
    byPagePath: Object.entries(groupedByPagePath).map(([pagePath, eventCount]) => ({
      pagePath,
      eventCount,
    })),
    byDate: Object.entries(groupedByDate).map(([date, eventCount]) => ({
      date,
      eventCount,
    })),
  };
}

export async function GET(request) {
  try {
    const { client, property } = createGa4Client();
    const { preset, startDate, endDate } = parseRequestedRange(request.url);
    const interactionDateRanges = [{ startDate, endDate }];

    const [overviewReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    });

    // Keep page_view logic intact.
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

    // Single report for all relevant routes; we aggregate rows into exact cards below.
    const exactPaths = PAGE_DEFINITIONS.flatMap((item) => buildExactPathFilters(item.path));
    const uniqueExactPaths = [...new Set(exactPaths)];

    const [pageBreakdownReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            ...uniqueExactPaths.map((path) => ({
              filter: {
                fieldName: "pagePath",
                stringFilter: { matchType: "EXACT", value: path },
              },
            })),
            {
              filter: {
                fieldName: "pagePath",
                stringFilter: { matchType: "BEGINS_WITH", value: "/insights/" },
              },
            },
            ...LOCALE_PREFIXES.map((locale) => ({
              filter: {
                fieldName: "pagePath",
                stringFilter: { matchType: "BEGINS_WITH", value: `/${locale}/insights/` },
              },
            })),
          ],
        },
      },
      limit: 1000,
    });

    const pageAccumulator = {};
    for (const page of PAGE_DEFINITIONS) {
      pageAccumulator[page.key] = {
        key: page.key,
        label: page.label,
        path: page.path,
        activeUsers: 0,
        screenPageViews: 0,
      };
    }

    let insightsDetailUsers = 0;
    let insightsDetailViews = 0;

    for (const row of pageBreakdownReport.rows || []) {
      const path = normalizePath(row.dimensionValues?.[0]?.value || "");
      const activeUsers = Number(row.metricValues?.[0]?.value || 0);
      const pageViews = Number(row.metricValues?.[1]?.value || 0);

      const staticMatch = PAGE_DEFINITIONS.find((item) => normalizePath(item.path) === path);
      if (staticMatch) {
        pageAccumulator[staticMatch.key].activeUsers += activeUsers;
        pageAccumulator[staticMatch.key].screenPageViews += pageViews;
      }

      if (path.startsWith("/insights/")) {
        insightsDetailUsers += activeUsers;
        insightsDetailViews += pageViews;
      }
    }

    const pages = [
      ...Object.values(pageAccumulator),
      {
        key: "insightsDetail",
        label: "Insights Detail Pages (insights/:id)",
        path: "/insights/:id",
        activeUsers: insightsDetailUsers,
        screenPageViews: insightsDetailViews,
      },
    ];

    const interactionDimensions = [
      { name: "eventName" },
      { name: "customEvent:element_id" },
      { name: "customEvent:form_id" },
      { name: "customEvent:locale" },
      { name: "pagePath" },
      { name: "date" },
    ];

    const [buttonClickReport] = await client.runReport({
      property,
      dateRanges: interactionDateRanges,
      dimensions: interactionDimensions,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "button_click",
            matchType: "EXACT",
          },
        },
      },
      limit: 1000,
    });

    const [formSubmitReport] = await client.runReport({
      property,
      dateRanges: interactionDateRanges,
      dimensions: interactionDimensions,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            value: "form_submit",
            matchType: "EXACT",
          },
        },
      },
      limit: 1000,
    });

    const buttonClicks = mapInteractionRows(
      buttonClickReport.rows || [],
      "button_click"
    );
    const formSubmissions = mapInteractionRows(
      formSubmitReport.rows || [],
      "form_submit"
    );

    return NextResponse.json({
      ok: true,
      data: {
        range: {
          preset,
          startDate,
          endDate,
        },
        activeUsers: Number(overviewRow?.metricValues?.[0]?.value || 0),
        screenPageViews: Number(overviewRow?.metricValues?.[1]?.value || 0),
        sampleEvent: {
          eventName: eventRow?.dimensionValues?.[0]?.value || "page_view",
          eventCount: Number(eventRow?.metricValues?.[0]?.value || 0),
        },
        pages,
        interactions: {
          buttonClicks,
          formSubmissions,
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
