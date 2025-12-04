"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function BlogsSection() {
  const users = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User List</CardTitle>
        <CardDescription>Manage all users in your system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between p-3 bg-card border rounded-lg"
            >
              <span className="text-foreground">{name}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
