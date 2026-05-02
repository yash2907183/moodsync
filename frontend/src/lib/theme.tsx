"use client"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"
interface ThemeCtx { theme: Theme; toggle: () => void }
const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const stored = localStorage.getItem("ms-theme") as Theme | null
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    applyTheme(stored ?? sys)
  }, [])

  function applyTheme(t: Theme) {
    setTheme(t)
    document.documentElement.classList.toggle("dark", t === "dark")
    localStorage.setItem("ms-theme", t)
  }

  return (
    <Ctx.Provider value={{ theme, toggle: () => applyTheme(theme === "dark" ? "light" : "dark") }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
