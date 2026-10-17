import { AnimatePresence, motion } from "framer-motion"
import { BrandLogo, useLogoAvailable } from "@/components/brand/BrandLogo"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import { ease } from "@/themes/motion"
import styles from "./LogoBug.module.css"

const cls = (key: string): string => styles[key] ?? ""

/**
 * Logo de la iglesia como marca de agua en la esquina superior derecha
 * (dentro de title-safe). Con brillo dorado cálido y tamaño destacado.
 */
export function LogoBug() {
  const enabled = useGraphicsStore((s) => s.brand.logoBug)
  const available = useLogoAvailable()
  if (!available) return null

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className={cls("bugWrapper")}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 0.95, scale: 1, transition: { duration: 1.2, ease: ease.outExpo } }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <BrandLogo className={cls("bugLogo")} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
