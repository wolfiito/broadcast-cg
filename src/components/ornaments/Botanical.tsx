import { motion, type Variants } from "framer-motion"
import { ease } from "@/themes/motion"

/*
 * Ornamentos de trazo fino (rama de hojas y línea ondulada), generados como SVG.
 * Al ser vectores con `pathLength`, Framer Motion los "dibuja" trazo a trazo.
 *
 * Dentro de una pleca heredan hidden/visible/exit de la caja.
 * Fuera de ella (pantallas completas) se usan con `standalone`.
 */

type Point = readonly [number, number]

const r = (n: number) => Math.round(n * 10) / 10

/** Punto y tangente de una curva Bézier cúbica en t. */
function bezier(p: readonly Point[], t: number): { pt: Point; angle: number } {
  const [p0, p1, p2, p3] = p as [Point, Point, Point, Point]
  const mt = 1 - t
  const x = mt ** 3 * p0[0] + 3 * mt ** 2 * t * p1[0] + 3 * mt * t ** 2 * p2[0] + t ** 3 * p3[0]
  const y = mt ** 3 * p0[1] + 3 * mt ** 2 * t * p1[1] + 3 * mt * t ** 2 * p2[1] + t ** 3 * p3[1]
  const dx = 3 * mt ** 2 * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t ** 2 * (p3[0] - p2[0])
  const dy = 3 * mt ** 2 * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t ** 2 * (p3[1] - p2[1])
  return { pt: [x, y], angle: Math.atan2(dy, dx) }
}

/** Hoja lanceolada: dos curvas de la base a la punta + nervadura central. */
function leafPath(base: Point, angle: number, length: number): string {
  const [bx, by] = base
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const w = length * 0.3
  const tip: Point = [bx + ux * length, by + uy * length]
  const mid: Point = [bx + ux * length * 0.5, by + uy * length * 0.5]
  const c1: Point = [mid[0] - uy * w, mid[1] + ux * w]
  const c2: Point = [mid[0] + uy * w, mid[1] - ux * w]
  const rib: Point = [bx + ux * length * 0.8, by + uy * length * 0.8]
  return (
    `M${r(bx)} ${r(by)} Q${r(c1[0])} ${r(c1[1])} ${r(tip[0])} ${r(tip[1])} ` +
    `Q${r(c2[0])} ${r(c2[1])} ${r(bx)} ${r(by)} M${r(bx)} ${r(by)} L${r(rib[0])} ${r(rib[1])}`
  )
}

const STEM: readonly Point[] = [
  [20, 292],
  [70, 205],
  [118, 120],
  [226, 16],
]

/** Rama completa precalculada (tallo + hojas alternadas que decrecen hacia la punta). */
const BRANCH_PATHS: string[] = (() => {
  const [start, ...controls] = STEM as [Point, ...Point[]]
  const paths = [`M${start.join(" ")} C${controls.map((p) => p.join(" ")).join(" ")}`]
  const stops = [0.16, 0.3, 0.44, 0.58, 0.72, 0.85]
  stops.forEach((t, i) => {
    const { pt, angle } = bezier(STEM, t)
    const side = i % 2 === 0 ? -1 : 1
    const length = 74 - i * 7
    paths.push(leafPath(pt, angle + side * 0.95, length))
  })
  const end = bezier(STEM, 1)
  paths.push(leafPath(end.pt, end.angle, 34))
  return paths
})()

/** Variantes de "dibujo": cada trazo aparece con un pequeño desfase. */
export function drawVariants(baseDelay = 0.3, step = 0.11, duration = 1.5): Variants {
  return {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration, delay: baseDelay + i * step, ease: ease.outQuart },
        opacity: { duration: 0.2, delay: baseDelay + i * step },
      },
    }),
    exit: { opacity: 0, transition: { duration: 0.45, ease: ease.inOutSine } },
  }
}

interface OrnamentProps {
  className?: string
  /** Fuera de una pleca: el ornamento controla su propia animación. */
  standalone?: boolean
  baseDelay?: number
}

const standaloneProps = { initial: "hidden", animate: "visible", exit: "exit" } as const

export function LeafBranch({ className, standalone, baseDelay = 0.35 }: OrnamentProps) {
  const draw = drawVariants(baseDelay)
  return (
    <motion.svg
      viewBox="0 0 240 300"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...(standalone ? standaloneProps : {})}
    >
      {BRANCH_PATHS.map((d, i) => (
        <motion.path key={i} d={d} variants={draw} custom={i} />
      ))}
    </motion.svg>
  )
}

/** Línea ondulada fina que atraviesa el ancho del contenedor. */
export function WaveLine({ className, standalone, baseDelay = 0.5 }: OrnamentProps) {
  const draw = drawVariants(baseDelay, 0, 1.8)
  return (
    <motion.svg
      viewBox="0 0 1600 40"
      preserveAspectRatio="none"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden
      {...(standalone ? standaloneProps : {})}
    >
      <motion.path
        d="M0 14 C 260 14, 420 34, 800 30 S 1340 6, 1600 22"
        variants={draw}
        custom={0}
        vectorEffect="non-scaling-stroke"
      />
    </motion.svg>
  )
}

/** Curvas largas para fondos de pantalla completa. */
export function FlowLines({ className, standalone, baseDelay = 0.2 }: OrnamentProps) {
  const draw = drawVariants(baseDelay, 0.4, 3.2)
  return (
    <motion.svg
      viewBox="0 0 600 1080"
      preserveAspectRatio="xMinYMid slice"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden
      {...(standalone ? standaloneProps : {})}
    >
      <motion.path d="M-20 420 C 120 470, 140 640, 250 760 S 420 1000, 470 1100" variants={draw} custom={0} />
      <motion.path d="M-20 560 C 90 600, 160 760, 230 860 S 300 1020, 330 1100" variants={draw} custom={1} />
    </motion.svg>
  )
}
