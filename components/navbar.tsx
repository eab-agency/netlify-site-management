"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Server, Activity, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-6 w-6" />
            <span className="text-lg font-bold">IWC Sites Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4 md:gap-6">
              <Link
                href="/"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                  pathname === "/" ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Server className="h-4 w-4" />
                <span>Sites</span>
              </Link>
              {/* <Link
                href="/builds"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                  pathname === "/builds" ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Activity className="h-4 w-4" />
                <span>Active Builds</span>
              </Link> */}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
