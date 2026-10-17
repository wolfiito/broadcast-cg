import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import { ease } from "@/themes/motion"

function useClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // Alinea el tick al cambio de minuto para que el reloj no se atrase visualmente.
    let interval: number | undefined
    const timeout = window.setTimeout(
      () => {
        setNow(new Date())
        interval = window.setInterval(() => setNow(new Date()), 60_000)
      },
      60_000 - (Date.now() % 60_000),
    )
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [])
  return now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

/** "Bug" de esquina: indicador EN VIVO + reloj, superior izquierdo (el derecho es para el logo). */
export function LiveBug() {
  const { enabled, label } = useGraphicsStore((s) => s.liveBug)
  const time = useClock()

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className="absolute top-[54px] left-[96px] flex items-stretch overflow-hidden rounded-md font-['Montserrat'] text-[20px] font-semibold tracking-[0.16em] text-white shadow-[0_10px_30px_rgb(0_0_0/0.45)]"
          initial={{ opacity: 0, x: -40, clipPath: "inset(0% 100% 0% 0%)" }}
          animate={{ opacity: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.8, ease: ease.outExpo } }}
          exit={{ opacity: 0, x: -30, transition: { duration: 0.4, ease: ease.inOutCirc } }}
        >
          <span className="flex items-center gap-3 bg-black/70 px-5 py-2.5">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70" />
              <span className="relative inline-flex size-3 rounded-full bg-red-500" />
            </span>
            {label}
          </span>
          <span className="border-l border-white/15 bg-black/55 px-5 py-2.5 font-medium tabular-nums">{time}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
