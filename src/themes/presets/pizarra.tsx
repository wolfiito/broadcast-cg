import { motion, type Variants } from "framer-motion"
import type { CSSProperties } from "react"
import type { ContentKind } from "@/lib/freeshow/parseSlide"
import { fromCssModule, type ThemeDefinition } from "../types"
import { BOX_EXIT_DELAY, ease, maskLine, springs } from "../motion"
import styles from "./pizarra.module.css"

const cls = (key: string): string => styles[key] ?? ""

const PAPER_GRAIN_URL = "brand/pizarra_grain.png"

const grainStyle = {
  "--paper-grain": `url(${PAPER_GRAIN_URL})`,
} as CSSProperties

/* ── Animaciones escalonadas de las 3 capas de papel rasgado ── */
const layerAshVariants: Variants = {
  hidden: { opacity: 0, x: -65, y: 14, rotate: -0.9 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: { duration: 0.95, ease: ease.outExpo, delay: 0.04 },
  },
  exit: {
    opacity: 0,
    x: -48,
    y: 12,
    rotate: -0.6,
    transition: { duration: 0.48, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY + 0.12 },
  },
}

const layerSlateVariants: Variants = {
  hidden: { opacity: 0, x: 70, y: 16, rotate: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: { duration: 1.05, ease: ease.outExpo, delay: 0.16 },
  },
  exit: {
    opacity: 0,
    x: 52,
    y: 12,
    rotate: 0.6,
    transition: { duration: 0.48, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY + 0.06 },
  },
}

const layerIceVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.975 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1.15, ease: ease.outExpo, delay: 0.28 },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.98,
    transition: { duration: 0.45, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY },
  },
}

const barVariants: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: { scaleY: 1, opacity: 1, transition: { duration: 0.95, ease: ease.outExpo, delay: 0.35 } },
  exit: { scaleY: 0, opacity: 0, transition: { duration: 0.35, ease: ease.inExpo } },
}

const FROST_DOTS: ReadonlyArray<{ left: string; size: string; dur: string; delay: string; tone: "rose" | "ice" }> = [
  { left: "7%", size: "6px", dur: "9s", delay: "0s", tone: "rose" },
  { left: "16%", size: "4px", dur: "12s", delay: "-3s", tone: "ice" },
  { left: "27%", size: "5px", dur: "11s", delay: "-6s", tone: "rose" },
  { left: "44%", size: "4px", dur: "13s", delay: "-4s", tone: "ice" },
  { left: "62%", size: "4px", dur: "11.5s", delay: "-8s", tone: "rose" },
  { left: "74%", size: "5px", dur: "10s", delay: "-2s", tone: "ice" },
  { left: "85%", size: "6px", dur: "12.5s", delay: "-5s", tone: "rose" },
  { left: "93%", size: "4px", dur: "9.5s", delay: "-7s", tone: "ice" },
]

function PizarraDecor({ kind }: { kind: ContentKind }) {
  return (
    <>
      <div aria-hidden className={cls("layeredPapers")} style={grainStyle}>
        <svg className={cls("svgDefs")} aria-hidden="true">
          <filter id="pizarra-torn-edge" x="-5%" y="-15%" width="110%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.038" numOctaves={4} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={14} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        <motion.div className={`${cls("paperLayer")} ${cls("layerAsh")}`} variants={layerAshVariants} />
        <motion.div className={`${cls("paperLayer")} ${cls("layerSlate")}`} variants={layerSlateVariants} />
        <motion.div className={`${cls("paperLayer")} ${cls("layerIce")}`} variants={layerIceVariants} />
      </div>

      <div aria-hidden className={cls("frostParticles")}>
        {FROST_DOTS.map((dot, idx) => (
          <span
            key={idx}
            className={cls("frostDot")}
            data-tone={dot.tone}
            style={
              {
                "--left": dot.left,
                "--size": dot.size,
                "--dur": dot.dur,
                "--delay": dot.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {kind === "info" && <motion.span aria-hidden className={cls("bar")} variants={barVariants} />}
    </>
  )
}

export const pizarraTheme: ThemeDefinition = {
  id: "pizarra",
  label: "Pizarra",
  description: "Capas rasgadas animadas en pizarra profunda y café ceniza con citas y subtítulos en arena rosada.",
  classes: fromCssModule(styles),
  Decor: PizarraDecor,
  motion: {
    box: {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
      exit: {
        opacity: 0,
        transition: { duration: 0.55, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY + 0.14 },
      },
    },
    accent: {
      hidden: { scaleX: 0, opacity: 0 },
      visible: { scaleX: 1, opacity: 1, transition: { duration: 1.25, ease: ease.outExpo, delay: 0.34 } },
      exit: { scaleX: 0, opacity: 0, transition: { duration: 0.4, ease: ease.inExpo } },
    },
    timing: { enterDelay: 0.42, lineStagger: 0.1, subtitleDelay: 0.16 },
    line: maskLine(springs.soft),
  },
}
