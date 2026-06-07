"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes: only the client knows the resolved theme, so gate render until mounted.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const triggerClass = cn(
    "flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-foreground/5 flex-shrink-0",
    className
  );

  // Avoid hydration mismatch: render a placeholder until mounted.
  if (!mounted) {
    return (
      <button type="button" className={triggerClass} aria-label="Toggle theme">
        <Sun className="h-3.5 w-3.5" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={triggerClass}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
