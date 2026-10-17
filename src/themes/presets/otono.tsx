import { motion, type Variants } from "framer-motion"
import { FallingLeaves } from "@/components/ornaments/Autumn"
import type { ContentKind } from "@/lib/freeshow/parseSlide"
import { fromCssModule, type ThemeDefinition } from "../types"
import { BOX_EXIT_DELAY, ease, maskLine, springs } from "../motion"
import styles from "./otono.module.css"

const cls = (key: string): string => styles[key] ?? ""

/** Ruta relativa (como el logo): funciona en dev, en `dist/` servido y como archivo local en OBS. */
const KEY_VISUAL_URL = "brand/nuevo/keyvisual.png"

/** El key visual de la proyección vive, muy tenue, dentro de la pleca. */
const KeyVisual = () => <span aria-hidden className={cls("kv")} style={{ backgroundImage: `url(${KEY_VISUAL_URL})` }} />

/* Barra de luz del nombre: crece desde el centro hacia arriba y abajo. */
const bar: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: { scaleY: 1, opacity: 1, transition: { duration: 1, ease: ease.outExpo, delay: 0.2 } },
  exit: { scaleY: 0, opacity: 0, transition: { duration: 0.4, ease: ease.inExpo } },
}

/* Destello de luz (shimmer / light sweep) al entrar el expositor */
const shimmer: Variants = {
  hidden: { x: "-120%", opacity: 0 },
  visible: {
    x: "240%",
    opacity: [0, 1, 1, 0],
    transition: {
      duration: 1.1,
      ease: ease.outQuart,
      delay: 0.65,
      times: [0, 0.15, 0.85, 1],
    },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

const MAPLE_LEFT_URL = "brand/maple_branch_left.png"
const MAPLE_RIGHT_URL = "brand/maple_branch_right.png"

/* Animación de entrada orgánica para la rama de maple izquierda (naciendo de la esquina) */
const branchLeftVariants: Variants = {
  hidden: { opacity: 0, x: -14, y: 14, scale: 0.92 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 1.1, ease: ease.outExpo, delay: 0.25 },
  },
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.35, ease: ease.inExpo } },
}

/* Animación de entrada orgánica para la rama de maple derecha (naciendo de la esquina) */
const branchRightVariants: Variants = {
  hidden: { opacity: 0, x: 14, y: 14, scale: 0.92 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 1.1, ease: ease.outExpo, delay: 0.25 },
  },
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.35, ease: ease.inExpo } },
}

/** Ornamentos del key visual: hojas cayendo, ramas de maple y barra de luz. */
function OtonoDecor({ kind }: { kind: ContentKind }) {
  if (kind === "lyrics") return <FallingLeaves kind="lyrics" className={cls("fall")} leafClassName={cls("fallLeaf")} />

  if (kind === "info") {
    return (
      <>
        <KeyVisual />
        <motion.span className={cls("shimmer")} variants={shimmer} />
        <motion.span className={cls("bar")} variants={bar} />
      </>
    )
  }

  // Scripture (Versículo): Fondo limpio marrón (sin plantas de fondo) + ramas delicadas en esquinas inferiores
  return (
    <>
      <FallingLeaves kind="scripture" className={cls("fall")} leafClassName={cls("fallLeaf")} />
      <motion.img
        aria-hidden
        src={MAPLE_LEFT_URL}
        className={cls("branchLeft")}
        variants={branchLeftVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        alt=""
      />
      <motion.img
        aria-hidden
        src={MAPLE_RIGHT_URL}
        className={cls("branchRight")}
        variants={branchRightVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        alt=""
      />
    </>
  )
}

export const otonoTheme: ThemeDefinition = {
  id: "otono",
  label: "Otoño",
  description: "Key visual de Firefly: café profundo, luz ámbar desde arriba y hojas de roble en óxido.",
  classes: fromCssModule(styles),
  Decor: OtonoDecor,
  motion: {
    // Versículo y canción emergen de un desenfoque (como la luz del key visual); el nombre se barre desde la izquierda.
    box: {
      hidden: (kind: ContentKind) =>
        kind === "info"
          ? { opacity: 0, y: 0, filter: "blur(0px)", clipPath: "inset(0% 100% 0% 0%)" }
          : { opacity: 0, y: 26, filter: "blur(10px)", clipPath: "inset(0% 0% 0% 0%)" },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        clipPath: "inset(0% 0% 0% 0%)",
        transition: { default: { duration: 1.1, ease: ease.outExpo }, opacity: { duration: 0.7, ease: "linear" } },
        transitionEnd: { filter: "none" },
      },
      exit: (kind: ContentKind) =>
        kind === "info"
          ? { opacity: 0, clipPath: "inset(0% 100% 0% 0%)", transition: { duration: 0.65, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY } }
          : { opacity: 0, y: 16, filter: "blur(8px)", transition: { duration: 0.6, ease: ease.inOutCirc, delay: BOX_EXIT_DELAY } },
    },
    // Haz de luz superior: se abre desde el centro.
    accent: {
      hidden: { scaleX: 0, opacity: 0 },
      visible: { scaleX: 1, opacity: 1, transition: { duration: 1.4, ease: ease.outExpo, delay: 0.15 } },
      exit: { scaleX: 0, opacity: 0, transition: { duration: 0.45, ease: ease.inExpo } },
    },
    timing: { enterDelay: 0.42, lineStagger: 0.1, subtitleDelay: 0.22 },
    line: maskLine(springs.soft),
  },
}
