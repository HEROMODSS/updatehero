import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark" | "system";

function apply(mode: Mode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);
  const c = document.documentElement.classList;
  dark ? c.add("dark") : c.remove("dark");
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Mode | null) ?? "system";
    setMode(stored);
    apply(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("theme") ?? "system") === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
    apply(next);
  }

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  const label = mode === "light" ? "Light" : mode === "dark" ? "Dark" : "Auto";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      className="h-9 rounded-full bg-surface px-3 hover:bg-surface-2"
      title={`Theme: ${label} (click to switch)`}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
