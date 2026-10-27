import { motion, type Variants } from "framer-motion"
import type { CSSProperties } from "react"
import type { ContentKind } from "@/lib/freeshow/parseSlide"
import { fromCssModule, type ThemeDefinition } from "../types"
import { BOX_EXIT_DELAY, ease, maskLine, springs } from "../motion"
import styles from "./navidad.module.css"

const cls = (key: string): string => styles[key] ?? ""

const POINSETTIA_URL = "brand/poinsettia_corner.png"

/* Animación de entrada suave para las nochebuenas en las esquinas */
const flowerLeftVariants: Variants = {
  hidden: { opacity: 0, x: -16, y: 16, scale: 0.92 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 1.05, ease: ease.outExpo, delay: 0.22 },
  },
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.35, ease: ease.inExpo } },
}

const flowerRightVariants: Variants = {
  hidden: { opacity: 0, x: 16, y: 16, scale: 0.92 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 1.05, ease: ease.outExpo, delay: 0.22 },
  },
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.35, ease: ease.inExpo } },
}

/* Copos de nieve fijos para renderizado SSR / determinista */
const SNOW_FLAKES = [
  { left: "3%", size: "4px", dur: "3.4s", delay: "-1.2s", sway: "1.6s" },
  { left: "6%", size: "3px", dur: "4.8s", delay: "-3.5s", sway: "2.1s" },
  { left: "10%", size: "5px", dur: "3.1s", delay: "-0.5s", sway: "1.4s" },
  { left: "13%", size: "3px", dur: "5.2s", delay: "-2.8s", sway: "2.3s" },
  { left: "86%", size: "4px", dur: "3.6s", delay: "-2.1s", sway: "1.8s" },
  { left: "89%", size: "5px", dur: "4.2s", delay: "-0.9s", sway: "2.0s" },
  { left: "93%", size: "3px", dur: "5.0s", delay: "-3.8s", sway: "2.4s" },
  { left: "96%", size: "4px", dur: "3.3s", delay: "-1.6s", sway: "1.5s" },
]

/**
 * Decoración común: Nochebuenas en esquinas y nieve cayendo adentro de la pleca
 */
function NavidadDecor({ kind }: { kind: ContentKind }) {
  return (
    <>
      {/* Capa de nieve confinada adentro del panel */}
      <div aria-hidden className={cls("snowContainer")}>
        {SNOW_FLAKES.map((flake, idx) => (
          <span
            key={idx}
            className={cls("snowflake")}
            style={
              {
                left: flake.left,
                width: flake.size,
                height: flake.size,
                animationDuration: `${flake.dur}, ${flake.sway}`,
                animationDelay: `${flake.delay}, ${flake.delay}`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Nochebuena izquierda (en scripture y lyrics) */}
      {kind !== "info" && (
        <motion.img
          aria-hidden
          src={POINSETTIA_URL}
          className={`${cls("poinsettiaCorner")} ${cls("poinsettiaLeft")}`}
          variants={flowerLeftVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          alt=""
        />
      )}

      {/* Nochebuena derecha (en todas las plecas) */}
      <motion.img
        aria-hidden
        src={POINSETTIA_URL}
        className={`${cls("poinsettiaCorner")} ${cls("poinsettiaRight")}`}
        variants={flowerRightVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        alt=""
      />
    </>
  )
}

const baseClasses = fromCssModule(styles)

/* ── TEMA 1: NAVIDAD BISEL ESCARLATA ── */
export const navidadBiselTheme: ThemeDefinition = {
  id: "navidad_bisel",
  label: "Navidad (Bisel)",
  description: "Bisel rojo escarlata superior, fondo negro carbón, nochebuenas aterciopeladas y nieve confinada.",
  classes: {
    ...baseClasses,
    panel: `${baseClasses.panel} ${cls("panelBisel")}`,
  },
  Decor: NavidadDecor,
  motion: {
    box: {
      hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { default: { duration: 1.05, ease: ease.outExpo }, opacity: { duration: 0.65, ease: "linear" } },
        transitionEnd: { filter: "none" },
      },
      exit: {
        opacity: 0,
        y: 16,
        filter: "blur(6px)",
        transition: { duration: 0.55, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY },
      },
    },
    accent: {
      hidden: { scaleY: 0, opacity: 0 },
      visible: { scaleY: 1, opacity: 1, transition: { duration: 0.95, ease: ease.outExpo, delay: 0.25 } },
      exit: { scaleY: 0, opacity: 0, transition: { duration: 0.35, ease: ease.inExpo } },
    },
    timing: { enterDelay: 0.38, lineStagger: 0.1, subtitleDelay: 0.18 },
    line: maskLine(springs.soft),
  },
}

/* ── TEMA 2: NAVIDAD CARMESÍ SOLEMNE ── */
export const navidadCarmesiTheme: ThemeDefinition = {
  id: "navidad_carmesi",
  label: "Navidad (Carmesí)",
  description: "Doble filete fino carmesí solemne, nochebuenas en esquinas, fondo negro terciopelo y nieve confinada.",
  classes: {
    ...baseClasses,
    panel: `${baseClasses.panel} ${cls("panelCarmesi")}`,
  },
  Decor: NavidadDecor,
  motion: {
    box: {
      hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { default: { duration: 1.05, ease: ease.outExpo }, opacity: { duration: 0.65, ease: "linear" } },
        transitionEnd: { filter: "none" },
      },
      exit: {
        opacity: 0,
        y: 16,
        filter: "blur(6px)",
        transition: { duration: 0.55, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY },
      },
    },
    accent: {
      hidden: { scaleY: 0, opacity: 0 },
      visible: { scaleY: 1, opacity: 1, transition: { duration: 0.95, ease: ease.outExpo, delay: 0.25 } },
      exit: { scaleY: 0, opacity: 0, transition: { duration: 0.35, ease: ease.inExpo } },
    },
    timing: { enterDelay: 0.38, lineStagger: 0.1, subtitleDelay: 0.18 },
    line: maskLine(springs.soft),
  },
}
