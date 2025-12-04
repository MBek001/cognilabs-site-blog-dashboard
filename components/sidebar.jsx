"use client"

import { LayoutDashboard, Book, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

const menuItems = [
  { id: "dashboard", url: '/dashboard', label: "Dashboard", icon: LayoutDashboard },
  { id: "blogs", url: '/blogs', label: "Blogs", icon: Book },
]

export default function Sidebar({ activeSection, setActiveSection }) {
  const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)

  const handleLogout = () => {
    // 1) Tokenni o'chirish
    localStorage.removeItem("token") // agar token localStorageda bo'lsa
    // cookies ishlatilsa, cookies ni ham o'chirish kerak

    // 2) Login sahifasiga yo'naltirish
    router.push("/login")
  }

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground">Dashboard</h1>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <Link
              href={item.url}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border relative">
  <Button
    variant="ghost"
    onClick={() => setIsModalOpen(true)}
    className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
  >
    <LogOut size={20} />
    <span>Logout</span>
  </Button>

  {/* Modal faqat button container ichida */}
  {isModalOpen && (
    <div className="absolute bottom-14 left-2 bg-zinc-900 p-4 rounded-2xl w-72 border border-zinc-700 shadow-lg z-50">
      <h2 className="text-lg font-bold mb-1 text-white">Confirm Logout</h2>
      <p className="text-gray-400 mb-4">Are you sure you want to log out?</p>
      <div className="flex justify-end pt-1 gap-2">
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(false)}
          className="text-black cursor-pointer border-gray-600 "
        >
          Cancel
        </Button>
        <Button
          onClick={handleLogout}
          className="bg-red-600 cursor-pointer hover:bg-red-700 text-white"
        >
          Logout
        </Button>
      </div>
    </div>
  )}
</div>

    </aside>
  )
}
