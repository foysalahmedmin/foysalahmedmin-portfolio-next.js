"use client";

import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/setting-slice";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.setting);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleToggle = () => {
    dispatch(toggleTheme());
    
    // The actual class toggle is handled in the layout script, 
    // but we can force an update here if needed for immediate feedback 
    // though the script in layout.tsx reads from localStorage which toggleTheme updates.
    // However, toggleTheme just updates the state, the script in layout.tsx runs on initial load.
    // We need a side effect to update the DOM.
  };

  return (
    <button
      onClick={handleToggle}
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
      title={`Current theme: ${theme}`}
    >
      <div className="relative h-5 w-5">
        <Sun
          className={cn(
            "absolute inset-0 transition-all duration-300",
            theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 transition-all duration-300",
            theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          )}
        />
        <Monitor
          className={cn(
            "absolute inset-0 transition-all duration-300",
            theme === "system" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-180 opacity-0"
          )}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};

export default ThemeSwitcher;
