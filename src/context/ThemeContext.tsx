import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// سیستم تم: حالت روشن/تیره/سیستمی + رنگ برند + اندازه متن — برای هر کاربر
// (در نسخه عملیاتی در پروفایل کاربر ذخیره می‌شود؛ اینجا localStorage)
// ---------------------------------------------------------------------------
export type ThemeMode = "light" | "dark" | "system";
export type FontScale = "normal" | "large";

export type AccentPreset = {
  id: string;
  label: string;
  swatch: string;
  vars: Record<string, string>; // برند ۵۰..۹۰۰
};

const scale = (v: Record<number, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(v).map(([k, val]) => [`--color-brand-${k}`, val]));

export const accentPresets: AccentPreset[] = [
  {
    id: "blue",
    label: "آبی سازمانی",
    swatch: "#1f4f99",
    vars: scale({ 50: "#eef4fc", 100: "#d9e7f8", 200: "#b3cef1", 300: "#82aee6", 400: "#4d87d6", 500: "#2a66bd", 600: "#1f4f99", 700: "#1b4079", 800: "#17325f", 900: "#112442" }),
  },
  {
    id: "teal",
    label: "سبزآبی",
    swatch: "#0d9488",
    vars: scale({ 50: "#effaf8", 100: "#d4f3ef", 200: "#a8e6df", 300: "#6fd1c7", 400: "#38b2a8", 500: "#149086", 600: "#0d9488", 700: "#0f6e66", 800: "#115851", 900: "#124440" }),
  },
  {
    id: "emerald",
    label: "سبز",
    swatch: "#15803d",
    vars: scale({ 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22a355", 600: "#15803d", 700: "#166534", 800: "#14532d", 900: "#103f23" }),
  },
  {
    id: "violet",
    label: "بنفش",
    swatch: "#6d28d9",
    vars: scale({ 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#6d28d9", 700: "#5b21b6", 800: "#4c1d95", 900: "#3b1678" }),
  },
  {
    id: "rose",
    label: "عنابی",
    swatch: "#be123c",
    vars: scale({ 50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#e11d48", 600: "#be123c", 700: "#9f1239", 800: "#881337", 900: "#6b0f2c" }),
  },
  {
    id: "amber",
    label: "کهربایی",
    swatch: "#b45309",
    vars: scale({ 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#f59e0b", 500: "#d97706", 600: "#b45309", 700: "#92400e", 800: "#78350f", 900: "#5f2a0c" }),
  },
];

type ThemeValue = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  accent: string;
  fontScale: FontScale;
  setMode: (m: ThemeMode) => void;
  setAccent: (id: string) => void;
  setFontScale: (f: FontScale) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode, accentId: string, fontScale: FontScale) {
  const root = document.documentElement;
  const resolved: "light" | "dark" = mode === "system" ? (systemDark() ? "dark" : "light") : mode;
  root.dataset.theme = resolved;
  root.dataset.font = fontScale;
  root.style.colorScheme = resolved;
  const preset = accentPresets.find((p) => p.id === accentId) ?? accentPresets[0];
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem("ms-theme") as ThemeMode) || "light");
  const [accent, setAccentState] = useState<string>(() => localStorage.getItem("ms-accent") || "blue");
  const [fontScale, setFontScaleState] = useState<FontScale>(() => (localStorage.getItem("ms-font") as FontScale) || "normal");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    setResolved(applyTheme(mode, accent, fontScale));
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme(mode, accent, fontScale));
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mode, accent, fontScale]);

  const setMode = (m: ThemeMode) => {
    localStorage.setItem("ms-theme", m);
    setModeState(m);
  };
  const setAccent = (id: string) => {
    localStorage.setItem("ms-accent", id);
    setAccentState(id);
  };
  const setFontScale = (f: FontScale) => {
    localStorage.setItem("ms-font", f);
    setFontScaleState(f);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, accent, fontScale, setMode, setAccent, setFontScale }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
