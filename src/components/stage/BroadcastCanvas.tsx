import { useLayoutEffect, useState, type ReactNode } from "react"

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

/**
 * Lienzo fijo 1920×1080 escalado al viewport.
 * Los temas se diseñan en píxeles reales de broadcast; si la Browser Source de OBS
 * es 1280×720 o el preview está en una ventana pequeña, todo escala de forma proporcional.
 */
export function BroadcastCanvas({ children, reserveRight = 0 }: { children: ReactNode; reserveRight?: number }) {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const update = () =>
      setScale(Math.min((window.innerWidth - reserveRight) / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT))
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [reserveRight])

  return (
    <div className="fixed inset-y-0 left-0 flex items-center justify-center overflow-hidden" style={{ right: reserveRight }}>
      <div
        className={`relative shrink-0 origin-center overflow-hidden ${reserveRight > 0 ? "outline outline-white/15" : ""}`}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  )
}
