"use client"

import Sidebar from "../../components/sidebar"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function DashboardGroupLayout({ children }) {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState("dashboard")

  useEffect(() => {
    if (pathname?.includes("/nimda-blogs")) {
      setActiveSection("blogs")
      return
    }

    if (pathname?.includes("/nimda-analytics")) {
      setActiveSection("analytics")
      return
    }

    setActiveSection("dashboard")
  }, [pathname])

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
