"use client"

import Sidebar from "../../components/sidebar"
import { useState } from "react"

export default function DashboardGroupLayout({ children }) {
  const [activeSection, setActiveSection] = useState("dashboard")

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
      <main className="flex-1 p-6 bg-background">
        {children}
      </main>
    </div>
  )
}
