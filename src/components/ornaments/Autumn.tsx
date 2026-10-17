import { motion, type MotionStyle, type Variants } from "framer-motion"
import type { CSSProperties } from "react"
import { ease } from "@/themes/motion"
import { drawVariants } from "./Botanical"

/*
 * Ornamentos de otoño: hojas de maple (arce) cayendo suavemente.
 * MapleLeaf se dibuja trazo a trazo; FallingLeaves son hojas de maple que caen en bucle.
 */

/** Contorno de hoja de maple (viewBox 0 0 100 108, punta arriba, tallo abajo). 5 puntas características. */
export const MAPLE_OUTLINE =
  "M 50,8 L 53.0,24.0 L 56.0,22.0 L 58.0,34.0 L 64.0,32.0 L 62.0,42.0 L 66.0,50.0 L 64.0,44.0 L 71.0,39.0 L 78.0,36.0 L 85.0,34.0 L 84.0,40.0 L 92.0,40.0 L 89.0,48.0 L 80.0,56.0 L 73.0,63.0 L 78.0,64.0 L 85.0,66.0 L 92.0,70.0 L 86.0,76.0 L 76.0,82.0 L 69.0,85.0 L 62.0,87.0 L 56.0,84.0 L 51.5,84.0 L 51.0,102.0 L 51,102 L 49,102 L 48.5,84.0 L 44.0,84.0 L 38.0,87.0 L 31.0,85.0 L 24.0,82.0 L 14.0,76.0 L 8.0,70.0 L 15.0,66.0 L 22.0,64.0 L 27.0,63.0 L 20.0,56.0 L 11.0,48.0 L 8.0,40.0 L 16.0,40.0 L 15.0,34.0 L 22.0,36.0 L 29.0,39.0 L 36.0,44.0 L 34.0,50.0 L 38.0,42.0 L 36.0,32.0 L 42.0,34.0 L 44.0,22.0 L 47.0,24.0 L 50.0,8.0 Z"

/** Nervaduras palmeadas de la hoja de maple (tallo y nervaduras principales a cada lóbulo). */
export const MAPLE_VEINS = [
  "M 50,102 L 50,84",
  "M 50,84 L 50,12",
  "M 50,84 L 16,35",
  "M 50,84 L 84,35",
  "M 50,84 L 10,70",
  "M 50,84 L 90,70",
  "M 50,55 L 38,44 M 50,55 L 62,44",
  "M 50,38 L 44,28 M 50,38 L 56,28",
  "M 32,58 L 22,50 M 68,58 L 78,50",
  "M 26,76 L 16,73 M 74,76 L 84,73",
]

interface OrnamentProps {
  className?: string
  style?: MotionStyle
  baseDelay?: number
}

/** Hoja de maple en trazo fino que se dibuja al entrar (hereda hidden/visible/exit de la caja). */
export function MapleLeaf({ className, style = {}, baseDelay = 0.45 }: OrnamentProps) {
  const draw = drawVariants(baseDelay, 0.12, 1.6)
  return (
    <motion.svg
      viewBox="0 0 100 108"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <motion.path d={MAPLE_OUTLINE} variants={draw} custom={0} />
      {MAPLE_VEINS.map((d, i) => (
        <motion.path key={i} d={d} variants={draw} custom={i + 1} strokeWidth={1} />
      ))}
    </motion.svg>
  )
}

/** Compatibilidad hacia atrás */
export const OakLeaf = MapleLeaf

const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.4, ease: ease.outQuart, delay: 0.6 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
}

interface LeafConfig {
  left: string
  size: number
  duration: number
  delay: number
  tone: "a" | "b" | "c" | "d"
  sway?: "a" | "b" | "c"
  center?: boolean
}

/** 
 * Canciones: más hojas en general (lluvia otoñal más tupida) y también algunas hojas
 * flotando suavemente en la zona central de las letras con opacidad y desenfoque sutil.
 */
const FALLING_LYRICS: readonly LeafConfig[] = [
  // Costado izquierdo
  { left: "3%", size: 30, duration: 11, delay: 0, tone: "a", sway: "a" },
  { left: "8%", size: 24, duration: 13, delay: 3, tone: "d", sway: "b" },
  { left: "14%", size: 22, duration: 14, delay: 6.5, tone: "b", sway: "a" },
  { left: "21%", size: 26, duration: 12, delay: 1.5, tone: "c", sway: "c" },
  
  // Zona de las letras (centro): no tantas, más sutiles para no estorbar la lectura
  { left: "33%", size: 19, duration: 16, delay: 4, tone: "b", sway: "b", center: true },
  { left: "46%", size: 17, duration: 17, delay: 9, tone: "c", sway: "a", center: true },
  { left: "55%", size: 21, duration: 15, delay: 2.5, tone: "a", sway: "c", center: true },
  { left: "67%", size: 18, duration: 18, delay: 7.5, tone: "b", sway: "b", center: true },
  
  // Costado derecho
  { left: "77%", size: 25, duration: 13, delay: 5, tone: "c", sway: "c" },
  { left: "84%", size: 20, duration: 15, delay: 10, tone: "b", sway: "a" },
  { left: "89%", size: 32, duration: 11.5, delay: 1.8, tone: "a", sway: "b" },
  { left: "95%", size: 23, duration: 14, delay: 8, tone: "d", sway: "c" },
  { left: "98%", size: 18, duration: 16, delay: 4.2, tone: "c", sway: "a" },
]

/**
 * Versículos / lecturas: cantidad más moderada de hojas, concentradas en orillas
 * y solo una que otra muy tenue cerca del centro para mantener la máxima reverencia y legibilidad.
 */
const FALLING_SCRIPTURE: readonly LeafConfig[] = [
  { left: "4%", size: 28, duration: 12, delay: 0, tone: "a", sway: "a" },
  { left: "13%", size: 22, duration: 14.5, delay: 4.5, tone: "b", sway: "b" },
  { left: "22%", size: 19, duration: 16, delay: 8.5, tone: "c", sway: "c" },
  // Centro tenue en versículos
  { left: "50%", size: 16, duration: 18, delay: 3, tone: "b", sway: "b", center: true },
  // Costado derecho
  { left: "78%", size: 21, duration: 15, delay: 9.5, tone: "c", sway: "a" },
  { left: "87%", size: 30, duration: 12.5, delay: 2, tone: "a", sway: "c" },
  { left: "95%", size: 24, duration: 14, delay: 6.5, tone: "d", sway: "b" },
]

interface FallingLeavesProps {
  className?: string
  leafClassName?: string
  kind?: "lyrics" | "scripture" | "info"
}

/**
 * Hojas de maple que caen en bucle animado continuo.
 * En "lyrics" caen más hojas (incluyendo en la zona de las letras con opacidad sutil).
 * En "scripture" cae una cantidad más moderada y elegante.
 */
export function FallingLeaves({ className, leafClassName, kind = "lyrics" }: FallingLeavesProps) {
  const leaves = kind === "lyrics" ? FALLING_LYRICS : FALLING_SCRIPTURE

  return (
    <motion.div className={className} variants={fade} aria-hidden>
      {leaves.map((leaf, i) => (
        <svg
          key={i}
          viewBox="0 0 100 108"
          className={leafClassName}
          data-tone={leaf.tone}
          data-sway={leaf.sway ?? "a"}
          data-center={leaf.center ? "true" : undefined}
          style={
            {
              "--left": leaf.left,
              "--size": `${leaf.size}px`,
              "--dur": `${leaf.duration}s`,
              "--delay": `-${leaf.delay}s`,
            } as CSSProperties
          }
        >
          <path d={MAPLE_OUTLINE} fill="currentColor" />
          <path
            d={MAPLE_VEINS.join(" ")}
            stroke="rgb(0 0 0 / 0.35)"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </motion.div>
  )
}
