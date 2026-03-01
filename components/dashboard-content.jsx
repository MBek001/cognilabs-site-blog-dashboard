"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

const DEFAULT_LOCALE = "all"
const DEFAULT_RANGE = "30d"

const DEDICATED_BUTTON_KEYS = [
  {
    key: "homeContactNow",
    title: "Home Contact Now Button",
    description: "element_id: btn_home_contact_now | page: /<locale>/",
  },
]

const DEDICATED_FORM_KEYS = [
  {
    key: "homeMain",
    title: "Home Main Form",
    description: "form_id: form_home_main | page: /<locale>/",
  },
  {
    key: "aboutUs",
    title: "About Us Form",
    description: "form_id: form_about_us | page: /<locale>/about-us",
  },
  {
    key: "careers",
    title: "Careers Form",
    description: "form_id: careers-form-section | page: /<locale>/careers",
  },
  {
    key: "portfolio",
    title: "Portfolio Form",
    description: "form_id: form_portfolio | page: /<locale>/portfolio",
  },
]

export default function DashboardSection({ blogs }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [analytics, setAnalytics] = useState(null)
  const [realtime, setRealtime] = useState(null)
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [locale, setLocale] = useState(DEFAULT_LOCALE)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  async function fetchAnalytics(selectedRange = range, selectedLocale = locale) {
    setLoading(true)
    setError("")

    try {
      if (selectedRange === "custom" && (!customStartDate || !customEndDate)) {
        throw new Error("Please select both custom start and end dates.")
      }

      const params = new URLSearchParams()
      params.set("range", selectedRange)
      params.set("locale", selectedLocale)

      if (selectedRange === "custom" && customStartDate && customEndDate) {
        params.set("startDate", customStartDate)
        params.set("endDate", customEndDate)
      }

      const [analyticsRes, realtimeRes] = await Promise.all([
        fetch(`/api/analytics?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/analytics/realtime", { cache: "no-store" }),
      ])

      const analyticsJson = await analyticsRes.json()
      const realtimeJson = await realtimeRes.json()

      if (!analyticsRes.ok || !analyticsJson?.ok) {
        throw new Error(
          analyticsJson?.message || analyticsJson?.error || "Analytics API request failed."
        )
      }

      if (!realtimeRes.ok || !realtimeJson?.ok) {
        throw new Error(
          realtimeJson?.message || realtimeJson?.error || "Realtime API request failed."
        )
      }

      setAnalytics(analyticsJson.data)
      setRealtime(realtimeJson.data)
    } catch (err) {
      setError(err?.message || "Unexpected error while fetching analytics.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(DEFAULT_RANGE, DEFAULT_LOCALE)
  }, [])

  const summaryCards = [
    { label: "Total Blogs", value: blogs?.length ?? 0 },
    { label: "Active Users", value: analytics?.overview?.activeUsers ?? 0 },
    { label: "Page Views", value: analytics?.overview?.screenPageViews ?? 0 },
    {
      label: "Total Button Clicks",
      value: analytics?.interactions?.buttonClicks?.total ?? 0,
    },
    {
      label: "Total Form Submissions",
      value: analytics?.interactions?.formSubmissions?.total ?? 0,
    },
    {
      label: "Realtime Active Users",
      value: realtime?.activeUsersLast30Minutes ?? 0,
    },
  ]

  const buttonDateSeries = analytics?.interactions?.buttonClicks?.byDate || []
  const formDateSeries = analytics?.interactions?.formSubmissions?.byDate || []
  const topButtons = analytics?.interactions?.buttonClicks?.byElementId || []
  const topForms = analytics?.interactions?.formSubmissions?.byFormId || []
  const normalizedPages = analytics?.pages?.normalized || []
  const rawPages = analytics?.pages?.raw || []

  const dedicatedButtonCards = DEDICATED_BUTTON_KEYS.map((item) => ({
    ...item,
    data: analytics?.interactions?.buttonClicks?.dedicated?.[item.key],
  }))
  const dedicatedFormCards = DEDICATED_FORM_KEYS.map((item) => ({
    ...item,
    data: analytics?.interactions?.formSubmissions?.dedicated?.[item.key],
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm"
          >
            <option value="all">All locales</option>
            <option value="en">en</option>
            <option value="ru">ru</option>
            <option value="uz">uz</option>
          </select>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
          {range === "custom" && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[170px]"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[170px]"
              />
            </>
          )}
          <Button onClick={() => fetchAnalytics(range, locale)}>
            Apply
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Range: {analytics?.range?.startDate || "-"} to {analytics?.range?.endDate || "-"} | Locale:{" "}
        {analytics?.filters?.locale || "all"}
      </p>

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={`skeleton-${idx}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Analytics Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      {!loading && !error && !analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No analytics data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No data was returned by the analytics API.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && analytics && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Number(stat.value || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Dedicated Conversions</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[...dedicatedButtonCards, ...dedicatedFormCards].map((card) => (
                <Card key={card.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">
                      {Number(card?.data?.total || 0).toLocaleString()}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Breakdown by locale
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {(card?.data?.byLocale || []).map((item) => (
                          <div key={`${card.key}-${item.locale}`} className="rounded border p-2">
                            <p className="text-muted-foreground">{item.locale}</p>
                            <p className="font-semibold">{Number(item.eventCount || 0).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Top Interactions</h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Buttons</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>element_id</TableHead>
                        <TableHead className="text-right">eventCount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topButtons.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No button_click events found.
                          </TableCell>
                        </TableRow>
                      )}
                      {topButtons.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.id}</TableCell>
                          <TableCell className="text-right">{Number(item.eventCount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top Forms</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>form_id</TableHead>
                        <TableHead className="text-right">eventCount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topForms.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No form_submit events found.
                          </TableCell>
                        </TableRow>
                      )}
                      {topForms.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.id}</TableCell>
                          <TableCell className="text-right">{Number(item.eventCount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Interaction Trends</h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Clicks by Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      eventCount: {
                        label: "Button Clicks",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-56 w-full"
                  >
                    <LineChart data={buttonDateSeries}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="eventCount"
                        stroke="var(--color-eventCount)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Form Submits by Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      eventCount: {
                        label: "Form Submits",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-56 w-full"
                  >
                    <LineChart data={formDateSeries}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="eventCount"
                        stroke="var(--color-eventCount)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Page Performance</h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Normalized Pages (Default)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>normalizedPagePath</TableHead>
                        <TableHead className="text-right">activeUsers</TableHead>
                        <TableHead className="text-right">screenPageViews</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalizedPages.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No page data found.
                          </TableCell>
                        </TableRow>
                      )}
                      {normalizedPages.map((item) => (
                        <TableRow key={item.normalizedPagePath}>
                          <TableCell className="font-mono text-xs">{item.normalizedPagePath}</TableCell>
                          <TableCell className="text-right">{Number(item.activeUsers || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {Number(item.screenPageViews || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Raw Page Paths</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>rawPagePath</TableHead>
                        <TableHead className="text-right">activeUsers</TableHead>
                        <TableHead className="text-right">screenPageViews</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawPages.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No page data found.
                          </TableCell>
                        </TableRow>
                      )}
                      {rawPages.map((item) => (
                        <TableRow key={`${item.rawPagePath}-${item.screenPageViews}`}>
                          <TableCell className="font-mono text-xs">{item.rawPagePath}</TableCell>
                          <TableCell className="text-right">{Number(item.activeUsers || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {Number(item.screenPageViews || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
