import { useEffect } from "react"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import { THEME_IDS } from "@/themes/types"

export const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ["Espacio / Enter", "TAKE / OUT (alternar)"],
  ["Esc", "OUT inmediato"],
  [`1 – ${THEME_IDS.length}`, "Cambiar tema"],
  ["A", "Modo Auto / Manual"],
  ["G", "Guías de áreas seguras"],
  ["L", "Bug EN VIVO"],
  ["Ctrl + Enter", "En el editor: cue + TAKE"],
]

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
}

/** Atajos tipo consola de gráficos. Solo se activan cuando el panel de control está visible. */
export function useKeyboardShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      const store = useGraphicsStore.getState()

      if (e.key === "Escape") {
        store.hide()
        return
      }
      if (isTyping(e.target) || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === " " || e.key === "Enter") {
        // Un botón enfocado ya responde a Espacio/Enter: evitar doble disparo.
        if (e.target instanceof HTMLButtonElement) return
        e.preventDefault()
        store.toggle()
        return
      }

      const themeIndex = Number(e.key) - 1
      const themeId = THEME_IDS[themeIndex]
      if (themeId) {
        store.setTheme(themeId)
        return
      }

      switch (e.key.toLowerCase()) {
        case "a":
          store.setFollowMode(store.followMode === "auto" ? "manual" : "auto")
          break
        case "g":
          store.toggleSafeAreas()
          break
        case "l":
          store.setLiveBug({ enabled: !store.liveBug.enabled })
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled])
}
