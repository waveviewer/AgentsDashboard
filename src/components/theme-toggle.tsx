"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** Toggle between light and dark. Renders a stable placeholder until mounted
 *  to avoid a hydration mismatch (theme is unknown on the server). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // next-themes can't know the theme during SSR, so defer theme-dependent icon
  // rendering until after mount to avoid a hydration mismatch. useSyncExternalStore
  // gives us a server/client-aware flag without a setState-in-effect.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (isDark ? <Sun /> : <Moon />) : <Sun />}
    </Button>
  );
}
