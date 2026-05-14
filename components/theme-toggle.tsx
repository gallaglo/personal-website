"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, BookOpen } from "lucide-react";

type Theme = "light" | "dark" | "e-ink";

const cycle: Theme[] = ["light", "dark", "e-ink"];

const icons: Record<Theme, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  "e-ink": <BookOpen size={16} />,
};

const labels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  "e-ink": "E-ink",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && cycle.includes(stored)) {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  function toggle() {
    const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length];
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  if (!mounted) return <div className="w-16" />;

  return (
    <button
      onClick={toggle}
      aria-label={`Switch theme (current: ${labels[theme]})`}
      className="flex items-center gap-1.5 text-sm hover:text-gray-600"
    >
      {icons[theme]}
      <span>{labels[theme]}</span>
    </button>
  );
}
