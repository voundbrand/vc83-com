"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Brain, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

export function NavHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
            <span className="font-mono text-sm font-bold text-white">D</span>
          </div>
          <span className="font-mono text-lg font-bold text-white">Dryad Networks</span>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm transition-colors",
              pathname === "/" ? "bg-zinc-800 text-white" : "text-gray-400 hover:bg-zinc-800/50 hover:text-white",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/training"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm transition-colors",
              pathname === "/training"
                ? "bg-zinc-800 text-white"
                : "text-gray-400 hover:bg-zinc-800/50 hover:text-white",
            )}
          >
            <Brain className="h-4 w-4" />
            AI Training
          </Link>
        </nav>
      </div>
    </header>
  )
}
