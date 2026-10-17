import { useEffect } from "react"
import { useGraphicsStore } from "@/store/useGraphicsStore"

/**
 * Tiempo fijo de permanencia al aire (8 segundos) antes de cerrar cualquier pleca automáticamente.
 * Fijo y no configurable: garantiza que versículos, canciones, expositores y anuncios salgan a los 8s.
 */
export const AUTO_HIDE_SECONDS = 8

export function useAutoHide(): void {
  const onAir = useGraphicsStore((s) => s.onAir)
  const programId = useGraphicsStore((s) => s.program?.id)

  useEffect(() => {
    if (!onAir) return
    const timer = window.setTimeout(() => {
      useGraphicsStore.getState().hide()
    }, AUTO_HIDE_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [onAir, programId])
}

