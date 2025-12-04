"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardSection({ blogs }) {
  const stats = [
    { label: "Total blogs", value: blogs ? blogs.length : 0 },
    { label: "Site Visits", value: "45,231" },
    { label: "Active Sessions", value: "892" },
    { label: "Conversion Rate", value: "3.2%" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-3">
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
  );
}
