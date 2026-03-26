"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, FileText, Package, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/user-context"

const navLinks: readonly { href: string; label: string; exact?: boolean }[] = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/benefits", label: "Benefits" },
  { href: "/provisionen", label: "Provisionen" },
  { href: "/leistungen", label: "Leistungen" },
]

export function Navigation() {
  const pathname = usePathname()
  const { authMode, user, isLoggedIn, isLoading, login, logout } = useUser()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href)

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full overflow-visible bg-[#245876] transition-all duration-200",
        scrolled && "shadow-lg"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-200 sm:px-6 lg:px-8",
          scrolled ? "h-14" : "h-20"
        )}
      >
        {/* Logo: full shield at top (top half in blue, bottom half hangs over), white wordmark when scrolled */}
        <Link
          href="/"
          className={cn(
            "relative z-10 shrink-0",
            scrolled ? "self-center" : "self-start"
          )}
        >
          <img
            src="/logo-gruendungswerft.svg"
            alt="Gründungswerft"
            className={cn(
              "w-auto",
              scrolled ? "hidden" : "mt-[20px] h-[120px]"
            )}
          />
          <img
            src="/logo-white.svg"
            alt="Gründungswerft"
            className={cn(
              "w-auto",
              scrolled ? "h-7" : "hidden"
            )}
          />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-2 py-1 text-[13px] font-bold uppercase tracking-[1px] transition-colors hover:text-white",
                isActive(href, exact)
                  ? "text-white underline underline-offset-4 decoration-2"
                  : "text-white/80"
              )}
              style={{ fontFamily: '"depot-new-condensed-web", "Trebuchet MS", sans-serif' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* User menu */}
        {isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Avatar className="h-9 w-9 border border-white/20">
                <AvatarFallback className="bg-white/10 text-white">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.name || "Mein Konto"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/meine-angebote">
                  <Package className="mr-2 h-4 w-4" />
                  <span>Meine Angebote</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my-requests">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Meine Anfragen</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Einstellungen</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={() => {
              void login()
            }}
            disabled={isLoading}
            className="gap-2 border border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <LogIn className="h-4 w-4" />
            {isLoading
              ? "Lädt..."
              : authMode === "oidc"
                ? "Mitgliedslogin"
                : authMode === "platform"
                  ? "Anmelden"
                  : "Anmelden"}
          </Button>
        )}
      </div>
    </header>
  )
}
