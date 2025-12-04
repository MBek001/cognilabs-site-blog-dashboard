"use client"

import { Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-foreground">Welcome back!</h2>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell size={20} />
        </Button>
        <Button variant="ghost" size="icon">
          <User size={20} />
        </Button>
      </div>
    </header>
  )
}
