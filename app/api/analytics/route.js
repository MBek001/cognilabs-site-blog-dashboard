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

const INTERACTION_DEFINITIONS = [
  {
    key: "mainContactNowButton",
    label: "Main Page Contact Now Button",
    eventName: "contact_now_click",
    pagePath: "/",
  },
  {
    key: "mainPageForm",
    label: "Main Page Form",
    eventName: "main_form_submit",
    pagePath: "/",
  },
  {
    key: "aboutUsForm",
    label: "About Us Page Form",
    eventName: "about_form_submit",
    pagePath: "/about-us",
  },
  {
    key: "careersForm",
    label: "Careers Page Form",
    eventName: "careers_form_submit",
    pagePath: "/careers",
  },
  {
    key: "servicesForm",
    label: "Services Page Form",
    eventName: "services_form_submit",
    pagePath: "/services",
  },
];

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

export async function GET() {
  try {
    const { client, property } = createGa4Client();

    const [overviewReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
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

    // Query event counts for requested button clicks and form submissions.
    const [interactionsReport] = await client.runReport({
      property,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "eventName" }, { name: "pagePath" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: INTERACTION_DEFINITIONS.map((item) => item.eventName),
          },
        },
      },
      limit: 1000,
    });

    const interactions = INTERACTION_DEFINITIONS.map((item) => ({
      key: item.key,
      label: item.label,
      eventName: item.eventName,
      pagePath: item.pagePath,
      eventCount: 0,
    }));

    for (const row of interactionsReport.rows || []) {
      const eventName = row.dimensionValues?.[0]?.value || "";
      const pagePath = normalizePath(row.dimensionValues?.[1]?.value || "");
      const eventCount = Number(row.metricValues?.[0]?.value || 0);

      const match = interactions.find(
        (item) =>
          item.eventName === eventName &&
          normalizePath(item.pagePath) === pagePath
      );

      if (match) {
        match.eventCount += eventCount;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        range: "last_30_days",
        activeUsers: Number(overviewRow?.metricValues?.[0]?.value || 0),
        screenPageViews: Number(overviewRow?.metricValues?.[1]?.value || 0),
        sampleEvent: {
          eventName: eventRow?.dimensionValues?.[0]?.value || "page_view",
          eventCount: Number(eventRow?.metricValues?.[0]?.value || 0),
        },
        pages,
        interactions,
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
