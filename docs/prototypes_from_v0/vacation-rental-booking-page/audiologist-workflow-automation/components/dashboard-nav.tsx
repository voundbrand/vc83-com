"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Users, Settings, LayoutDashboard, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function DashboardNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Übersicht",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Berichte",
      href: "/dashboard/berichte",
      icon: FileText,
    },
    {
      title: "Patienten",
      href: "/dashboard/patienten",
      icon: Users,
    },
    {
      title: "Einstellungen",
      href: "/dashboard/einstellungen",
      icon: Settings,
    },
  ]

  return (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start", isActive && "bg-secondary text-secondary-foreground")}
            >
              <Icon className="mr-2 w-5 h-5" />
              {item.title}
            </Button>
          </Link>
        )
      })}

      <div className="mt-auto pt-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 w-5 h-5" />
          Abmelden
        </Button>
      </div>
    </nav>
  )
}
