"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardSection({ blogs }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [analytics, setAnalytics] = useState(null)
  const [realtime, setRealtime] = useState(null)
  const [range, setRange] = useState("30d")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  async function fetchAnalytics(selectedRange = range) {
    setLoading(true)
    setError("")

    try {
      if (selectedRange === "custom" && (!customStartDate || !customEndDate)) {
        throw new Error("Please select both custom start and end dates.")
      }

      const params = new URLSearchParams()
      params.set("range", selectedRange)

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
        throw new Error(analyticsJson?.error || "Analytics API request failed.")
      }

      if (!realtimeRes.ok || !realtimeJson?.ok) {
        throw new Error(realtimeJson?.error || "Realtime API request failed.")
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
    fetchAnalytics(range)
  }, [])

  const summaryCards = [
    { label: "Total Blogs", value: blogs?.length ?? 0 },
    { label: "Active Users (30 days)", value: analytics?.activeUsers ?? 0 },
    { label: "Page Views (30 days)", value: analytics?.screenPageViews ?? 0 },
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
    {
      label: `Event Count (${analytics?.sampleEvent?.eventName || "page_view"})`,
      value: analytics?.sampleEvent?.eventCount ?? 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
          {range === "custom" && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              />
            </>
          )}
          <button
            onClick={() => fetchAnalytics(range)}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Interaction range: {analytics?.range?.startDate || "-"} to {analytics?.range?.endDate || "-"}
      </p>

      {loading && <p>Loading analytics data...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
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
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Page Performance</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(analytics?.pages || []).map((page) => (
                <Card key={page.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{page.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{page.path}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Users: {page.activeUsers}</p>
                    <p>Page Views: {page.screenPageViews}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Tracked Interactions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Button Clicks by element_id</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(analytics?.interactions?.buttonClicks?.byElementId || []).map((item) => (
                    <p key={item.id}>{item.id}: {item.eventCount}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Form Submissions by form_id</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(analytics?.interactions?.formSubmissions?.byFormId || []).map((item) => (
                    <p key={item.id}>{item.id}: {item.eventCount}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Button Clicks by locale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(analytics?.interactions?.buttonClicks?.byLocale || []).map((item) => (
                    <p key={item.locale}>{item.locale}: {item.eventCount}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Form Submissions by locale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(analytics?.interactions?.formSubmissions?.byLocale || []).map((item) => (
                    <p key={item.locale}>{item.locale}: {item.eventCount}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Button Clicks by pagePath</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(analytics?.interactions?.buttonClicks?.byPagePath || []).map((item) => (
                    <p key={item.pagePath}>{item.pagePath}: {item.eventCount}</p>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Form Submissions by pagePath</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(analytics?.interactions?.formSubmissions?.byPagePath || []).map((item) => (
                    <p key={item.pagePath}>{item.pagePath}: {item.eventCount}</p>
                  ))}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Daily Interaction Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(analytics?.interactions?.buttonClicks?.byDate || []).map((item) => (
                    <p key={`button-${item.date}`}>
                      {item.date} button_click: {item.eventCount}
                    </p>
                  ))}
                  {(analytics?.interactions?.formSubmissions?.byDate || []).map((item) => (
                    <p key={`form-${item.date}`}>
                      {item.date} form_submit: {item.eventCount}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
