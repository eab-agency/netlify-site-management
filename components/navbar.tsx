"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Server, Activity } from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-6 w-6" />
            <span className="text-lg font-bold">Netlify Manager</span>
          </div>
          <nav className="flex items-center gap-4 md:gap-6">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                pathname === "/" ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Server className="h-4 w-4" />
              <span>Sites</span>
            </Link>
            <Link
              href="/builds"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                pathname === "/builds" ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Activity className="h-4 w-4" />
              <span>Active Builds</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
