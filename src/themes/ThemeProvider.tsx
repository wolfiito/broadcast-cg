import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react"
import { accentVariables } from "@/config/brand"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import { THEMES } from "./registry"
import { DEFAULT_THEME_ID, type ThemeDefinition } from "./types"

const ThemeContext = createContext<ThemeDefinition>(THEMES[DEFAULT_THEME_ID])

/**
 * Inyecta el tema activo (clases de CSS Module + variantes de movimiento) al árbol,
 * y el color de la iglesia como variables CSS (--accent…) que todos los temas usan.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useGraphicsStore((s) => s.themeId)
  const accent = useGraphicsStore((s) => s.brand.accent)
  const theme = THEMES[themeId]
  const style = useMemo(() => accentVariables(accent) as CSSProperties, [accent])

  return (
    <ThemeContext.Provider value={theme}>
      <div data-theme={theme.id} className="contents" style={style}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeDefinition {
  return useContext(ThemeContext)
}
