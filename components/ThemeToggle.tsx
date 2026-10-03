import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useTheme } from "../utils/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200/60 bg-white/60 dark:border-white/10 dark:bg-white/5" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-white/15 dark:bg-white/5 dark:text-zinc-400 dark:shadow-none dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:text-white"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <MoonIcon className="h-5 w-5 text-indigo-400 transition-transform duration-300 hover:-rotate-12" />
      ) : (
        <SunIcon className="h-5 w-5 text-amber-500 transition-transform duration-300 hover:rotate-45" />
      )}
    </button>
  );
}
