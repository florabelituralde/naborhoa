import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nabor-theme"; // "light" | "dark" | null (follow system)

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return systemPrefersDark();
}

function applyDark(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
}

// Manual dark-mode toggle that persists the user's choice and falls back
// to the OS setting when no explicit choice has been made.
export function useTheme() {
  const [isDark, setIsDark] = useState(resolveIsDark);

  useEffect(() => {
    applyDark(isDark);
  }, [isDark]);

  // Keep following the system when the user hasn't set an explicit preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) setIsDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  return { isDark, toggle };
}