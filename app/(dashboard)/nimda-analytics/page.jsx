"use client";

import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [realtime, setRealtime] = useState(null);

  async function fetchAnalytics() {
    setLoading(true);
    setError("");

    try {
      const [analyticsRes, realtimeRes] = await Promise.all([
        fetch("/api/analytics", { cache: "no-store" }),
        fetch("/api/analytics/realtime", { cache: "no-store" }),
      ]);

      const analyticsJson = await analyticsRes.json();
      const realtimeJson = await realtimeRes.json();

      if (!analyticsRes.ok || !analyticsJson?.ok) {
        throw new Error(analyticsJson?.error || "Analytics API request failed.");
      }

      if (!realtimeRes.ok || !realtimeJson?.ok) {
        throw new Error(realtimeJson?.error || "Realtime API request failed.");
      }

      setAnalytics(analyticsJson.data);
      setRealtime(realtimeJson.data);
    } catch (err) {
      setError(err?.message || "Unexpected error while fetching analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Google Analytics 4</h1>
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
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100">
                <tr>
                  <th className="border-b px-4 py-3 font-medium">Summary Metric</th>
                  <th className="border-b px-4 py-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b px-4 py-3">Active Users (30 days)</td>
                  <td className="border-b px-4 py-3">{analytics?.activeUsers ?? 0}</td>
                </tr>
                <tr>
                  <td className="border-b px-4 py-3">Screen/Page Views (30 days)</td>
                  <td className="border-b px-4 py-3">{analytics?.screenPageViews ?? 0}</td>
                </tr>
                <tr>
                  <td className="border-b px-4 py-3">
                    Event Count ({analytics?.sampleEvent?.eventName || "page_view"})
                  </td>
                  <td className="border-b px-4 py-3">
                    {analytics?.sampleEvent?.eventCount ?? 0}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Realtime Active Users (last 30 min)</td>
                  <td className="px-4 py-3">
                    {realtime?.activeUsersLast30Minutes ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100">
                <tr>
                  <th className="border-b px-4 py-3 font-medium">Page</th>
                  <th className="border-b px-4 py-3 font-medium">Path</th>
                  <th className="border-b px-4 py-3 font-medium">Users</th>
                  <th className="border-b px-4 py-3 font-medium">Page Views</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.pages || []).map((item) => (
                  <tr key={item.key}>
                    <td className="border-b px-4 py-3">{item.label}</td>
                    <td className="border-b px-4 py-3">{item.path}</td>
                    <td className="border-b px-4 py-3">{item.activeUsers}</td>
                    <td className="border-b px-4 py-3">{item.screenPageViews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100">
                <tr>
                  <th className="border-b px-4 py-3 font-medium">Interaction</th>
                  <th className="border-b px-4 py-3 font-medium">Event Name</th>
                  <th className="border-b px-4 py-3 font-medium">Page Path</th>
                  <th className="border-b px-4 py-3 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.interactions || []).map((item) => (
                  <tr key={item.key}>
                    <td className="border-b px-4 py-3">{item.label}</td>
                    <td className="border-b px-4 py-3">{item.eventName}</td>
                    <td className="border-b px-4 py-3">{item.pagePath}</td>
                    <td className="border-b px-4 py-3">{item.eventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
