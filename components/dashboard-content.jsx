"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardSection({ blogs }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [analytics, setAnalytics] = useState(null)
  const [realtime, setRealtime] = useState(null)

  async function fetchAnalytics() {
    setLoading(true)
    setError("")

    try {
      const [analyticsRes, realtimeRes] = await Promise.all([
        fetch("/api/analytics", { cache: "no-store" }),
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
    fetchAnalytics()
  }, [])

  const summaryCards = [
    { label: "Total Blogs", value: blogs?.length ?? 0 },
    { label: "Active Users (30 days)", value: analytics?.activeUsers ?? 0 },
    { label: "Page Views (30 days)", value: analytics?.screenPageViews ?? 0 },
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
        <button
          onClick={fetchAnalytics}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:opacity-90"
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading analytics data...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(analytics?.interactions || []).map((interaction) => (
                <Card key={interaction.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{interaction.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {interaction.eventName} on {interaction.pagePath}
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Count: {interaction.eventCount}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
