import { NextResponse } from "next/server";
import { createGa4Client } from "@/lib/ga4";

export const runtime = "nodejs";

const LOCALES = ["en", "ru", "uz"];
const LOCALE_ALL = "all";
const DIMENSION_FALLBACK = "(not set)";

const DEDICATED_BUTTONS = [
  {
    key: "homeContactNow",
    id: "btn_home_contact_now",
    normalizedPagePath: "/",
    label: "Home Contact Now Clicks",
  },
];

const DEDICATED_FORMS = [
  {
    key: "homeMain",
    id: "form_home_main",
    normalizedPagePath: "/",
    label: "Home Main Form Submissions",
  },
  {
    key: "aboutUs",
    id: "form_about_us",
    normalizedPagePath: "/about-us",
    label: "About Us Form Submissions",
  },
  {
    key: "careers",
    id: "careers-form-section",
    normalizedPagePath: "/careers",
    label: "Careers Form Submissions",
  },
  {
    key: "portfolio",
    id: "form_portfolio",
    normalizedPagePath: "/portfolio",
    label: "Portfolio Form Submissions",
  },
];

function sanitizeRawPath(input = "") {
  const value = String(input || "").trim();
  if (!value || value === DIMENSION_FALLBACK) return "/";
  const withoutQuery = value.split("?")[0].split("#")[0];
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const trimmed =
    withLeadingSlash === "/"
      ? "/"
      : withLeadingSlash.endsWith("/")
      ? withLeadingSlash.slice(0, -1)
      : withLeadingSlash;
  return trimmed || "/";
}

function normalizePath(input = "") {
  const trimmed = sanitizeRawPath(input);
  const parts = trimmed.split("/").filter(Boolean);

  if (parts.length === 0) return "/";

  if (LOCALES.includes(parts[0])) {
    const localizedPath = `/${parts.slice(1).join("/")}`;
    return localizedPath === "/" || localizedPath === "" ? "/" : localizedPath;
  }

  return trimmed;
}

function formatGaDate(value = "") {
  const raw = String(value || "");
  if (!/^\d{8}$/.test(raw)) return raw || DIMENSION_FALLBACK;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function toDimensionValue(row, index) {
  const value = row?.dimensionValues?.[index]?.value;
  return value && value.length > 0 ? value : DIMENSION_FALLBACK;
}

function toMetricValue(row, index) {
  return Number(row?.metricValues?.[index]?.value || 0);
}

function sortDescByEventCount(a, b) {
  if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount;
  return String(
    a.id || a.locale || a.normalizedPagePath || a.rawPagePath || ""
  ).localeCompare(
    String(b.id || b.locale || b.normalizedPagePath || b.rawPagePath || "")
  );
}

function sortDateAsc(a, b) {
  return String(a.date).localeCompare(String(b.date));
}

function toEventCountArray(grouped, mapKey) {
  return Object.entries(grouped)
    .map(([key, eventCount]) => mapKey(key, eventCount))
    .sort(sortDescByEventCount);
}

function localeSeriesWithDefaults(groupedByLocale) {
  return LOCALES.map((locale) => ({
    locale,
    eventCount: Number(groupedByLocale[locale] || 0),
  }));
}

function parseRequestedFilters(requestUrl) {
  const url = new URL(requestUrl);
  const preset = url.searchParams.get("range") || "30d";
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");
  const localeParam = (url.searchParams.get("locale") || LOCALE_ALL).toLowerCase();
  const locale = LOCALES.includes(localeParam) ? localeParam : LOCALE_ALL;

  const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

  if (preset === "7d") {
    return { preset, startDate: "7daysAgo", endDate: "today", locale };
  }

  if (
    preset === "custom" &&
    isIsoDate(startDateParam) &&
    isIsoDate(endDateParam)
  ) {
    return { preset, startDate: startDateParam, endDate: endDateParam, locale };
  }

  return { preset: "30d", startDate: "30daysAgo", endDate: "today", locale };
}

function buildPagePathFilter(locale) {
  if (!locale || locale === LOCALE_ALL) return undefined;

  return {
    filter: {
      fieldName: "pagePath",
      stringFilter: { matchType: "BEGINS_WITH", value: `/${locale}` },
    },
  };
}

function buildInteractionFilter(eventName, locale) {
  const expressions = [
    {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: eventName, matchType: "EXACT" },
      },
    },
  ];

  if (locale && locale !== LOCALE_ALL) {
    expressions.push({
      filter: {
        fieldName: "customEvent:locale",
        stringFilter: { value: locale, matchType: "EXACT" },
      },
    });
  }

  return expressions.length === 1
    ? expressions[0]
    : { andGroup: { expressions } };
}

function resolveInteractionRawPagePath(pagePathValue, customPagePathValue) {
  // Prefer GA4 built-in `pagePath` when present; fall back to custom event param
  // `customEvent:page_path` for events emitted with only custom path data.
  const builtInPath = String(pagePathValue || "");
  if (
    builtInPath &&
    builtInPath !== DIMENSION_FALLBACK &&
    builtInPath.startsWith("/")
  ) {
    return sanitizeRawPath(builtInPath);
  }

  return sanitizeRawPath(customPagePathValue);
}

function mapInteractionRows(rows = [], keyType) {
  const groupedByKey = {};
  const groupedByLocale = {};
  const groupedByDate = {};
  const groupedByPageNormalized = {};
  const groupedByPageRaw = {};

  const rowList = [];

  for (const row of rows) {
    const keyValue =
      keyType === "button"
        ? toDimensionValue(row, 1)
        : toDimensionValue(row, 2);
    const localeRaw = String(toDimensionValue(row, 3) || "").toLowerCase();
    const locale = LOCALES.includes(localeRaw) ? localeRaw : DIMENSION_FALLBACK;
    const rawPagePath = resolveInteractionRawPagePath(
      toDimensionValue(row, 4),
      toDimensionValue(row, 5)
    );
    const normalizedPagePath = normalizePath(rawPagePath);
    const date = formatGaDate(toDimensionValue(row, 6));
    const eventCount = toMetricValue(row, 0);

    groupedByKey[keyValue] = (groupedByKey[keyValue] || 0) + eventCount;
    groupedByLocale[locale] = (groupedByLocale[locale] || 0) + eventCount;
    groupedByDate[date] = (groupedByDate[date] || 0) + eventCount;
    groupedByPageNormalized[normalizedPagePath] =
      (groupedByPageNormalized[normalizedPagePath] || 0) + eventCount;
    groupedByPageRaw[rawPagePath] = (groupedByPageRaw[rawPagePath] || 0) + eventCount;

    rowList.push({
      [keyType === "button" ? "elementId" : "formId"]: keyValue,
      locale,
      rawPagePath,
      normalizedPagePath,
      date,
      eventCount,
    });
  }

  const total = rowList.reduce((sum, item) => sum + item.eventCount, 0);
  const byLocale = toEventCountArray(groupedByLocale, (locale, eventCount) => ({
    locale,
    eventCount,
  }));
  const byDate = Object.entries(groupedByDate)
    .map(([date, eventCount]) => ({ date, eventCount }))
    .sort(sortDateAsc);
  const byPageNormalized = toEventCountArray(
    groupedByPageNormalized,
    (normalizedPagePath, eventCount) => ({
      normalizedPagePath,
      eventCount,
    })
  );
  const byPageRaw = toEventCountArray(groupedByPageRaw, (rawPagePath, eventCount) => ({
    rawPagePath,
    eventCount,
  }));

  return {
    total,
    rows: rowList,
    [keyType === "button" ? "byElementId" : "byFormId"]: toEventCountArray(
      groupedByKey,
      (id, eventCount) => ({
        id,
        eventCount,
      })
    ),
    byLocale,
    byDate,
    byPageNormalized,
    byPageRaw,
  };
}

function buildDedicatedMetric(rows, { key, id, label, normalizedPagePath }, keyField) {
  const scopedRows = rows.filter(
    (row) =>
      row[keyField] === id && row.normalizedPagePath === normalizedPagePath
  );
  const total = scopedRows.reduce((sum, row) => sum + row.eventCount, 0);
  const groupedByLocale = {};
  const groupedByDate = {};

  for (const row of scopedRows) {
    groupedByLocale[row.locale] = (groupedByLocale[row.locale] || 0) + row.eventCount;
    groupedByDate[row.date] = (groupedByDate[row.date] || 0) + row.eventCount;
  }

  return {
    key,
    id,
    label,
    normalizedPagePath,
    total,
    byLocale: localeSeriesWithDefaults(groupedByLocale),
    byDate: Object.entries(groupedByDate)
      .map(([date, eventCount]) => ({ date, eventCount }))
      .sort(sortDateAsc),
  };
}

function mapPageRows(rows = []) {
  const raw = [];
  const normalizedAccumulator = {};

  for (const row of rows) {
    const rawPagePath = sanitizeRawPath(toDimensionValue(row, 0));
    const normalizedPagePath = normalizePath(rawPagePath);
    const activeUsers = toMetricValue(row, 0);
    const screenPageViews = toMetricValue(row, 1);

    raw.push({
      rawPagePath,
      normalizedPagePath,
      activeUsers,
      screenPageViews,
    });

    if (!normalizedAccumulator[normalizedPagePath]) {
      normalizedAccumulator[normalizedPagePath] = {
        normalizedPagePath,
        activeUsers: 0,
        screenPageViews: 0,
      };
    }

    normalizedAccumulator[normalizedPagePath].activeUsers += activeUsers;
    normalizedAccumulator[normalizedPagePath].screenPageViews += screenPageViews;
  }

  raw.sort((a, b) => {
    if (b.screenPageViews !== a.screenPageViews) {
      return b.screenPageViews - a.screenPageViews;
    }
    return b.activeUsers - a.activeUsers;
  });

  const normalized = Object.values(normalizedAccumulator).sort((a, b) => {
    if (b.screenPageViews !== a.screenPageViews) {
      return b.screenPageViews - a.screenPageViews;
    }
    return b.activeUsers - a.activeUsers;
  });

  return { raw, normalized };
}

export async function GET(request) {
  try {
    const { client, property } = createGa4Client();
    const { preset, startDate, endDate, locale } = parseRequestedFilters(
      request.url
    );
    const selectedDateRange = [{ startDate, endDate }];
    const pagePathFilter = buildPagePathFilter(locale);

    const [overviewReport] = await client.runReport({
      property,
      dateRanges: selectedDateRange,
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      ...(pagePathFilter ? { dimensionFilter: pagePathFilter } : {}),
    });

    const [pageBreakdownReport] = await client.runReport({
      property,
      dateRanges: selectedDateRange,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      ...(pagePathFilter ? { dimensionFilter: pagePathFilter } : {}),
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 5000,
    });

    const interactionDimensions = [
      { name: "eventName" },
      { name: "customEvent:element_id" },
      { name: "customEvent:form_id" },
      { name: "customEvent:locale" },
      { name: "pagePath" },
      { name: "customEvent:page_path" },
      { name: "date" },
    ];

    const [buttonClickReport] = await client.runReport({
      property,
      dateRanges: selectedDateRange,
      dimensions: interactionDimensions,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: buildInteractionFilter("button_click", locale),
      limit: 5000,
    });

    const [formSubmitReport] = await client.runReport({
      property,
      dateRanges: selectedDateRange,
      dimensions: interactionDimensions,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: buildInteractionFilter("form_submit", locale),
      limit: 5000,
    });

    const overviewRow = overviewReport.rows?.[0];
    const pages = mapPageRows(pageBreakdownReport.rows || []);
    const buttonClicks = mapInteractionRows(buttonClickReport.rows || [], "button");
    const formSubmissions = mapInteractionRows(formSubmitReport.rows || [], "form");
    const buttonDedicated = DEDICATED_BUTTONS.reduce((acc, item) => {
      acc[item.key] = buildDedicatedMetric(
        buttonClicks.rows,
        item,
        "elementId"
      );
      return acc;
    }, {});
    const formDedicated = DEDICATED_FORMS.reduce((acc, item) => {
      acc[item.key] = buildDedicatedMetric(formSubmissions.rows, item, "formId");
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      data: {
        range: {
          preset,
          startDate,
          endDate,
        },
        filters: {
          locale,
        },
        overview: {
          activeUsers: toMetricValue(overviewRow, 0),
          screenPageViews: toMetricValue(overviewRow, 1),
        },
        pages,
        interactions: {
          buttonClicks: {
            ...buttonClicks,
            dedicated: buttonDedicated,
          },
          formSubmissions: {
            ...formSubmissions,
            dedicated: formDedicated,
          },
        },
      },
    });
  } catch (error) {
    console.error("[api/analytics] Failed to fetch GA4 report", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to fetch analytics data",
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
