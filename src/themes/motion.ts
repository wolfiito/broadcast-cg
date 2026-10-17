import type { Transition, Variants } from "framer-motion"

/** Curvas tipo After Effects. Centralizadas para dar coherencia entre temas. */
export const ease = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuart: [0.25, 1, 0.5, 1],
  inOutCirc: [0.85, 0, 0.15, 1],
  inExpo: [0.7, 0, 0.84, 0],
  inOutSine: [0.37, 0, 0.63, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>

export const springs = {
  /** Revelado de texto: ligero overshoot, asienta rápido (sin rebote visible a 60 fps). */
  textReveal: { type: "spring", stiffness: 190, damping: 26, mass: 0.9 },
  /** Estilos suaves (worship / glass). */
  soft: { type: "spring", stiffness: 110, damping: 22, mass: 1 },
} as const satisfies Record<string, Transition>

/** Retardo de salida de la caja: deja que el texto salga primero (salida en capas). */
export const BOX_EXIT_DELAY = 0.28

/** Duración del cambio de alto de la caja cuando cambia el versículo. */
export const RESIZE_TRANSITION: Transition = { duration: 0.6, ease: ease.outQuart }

/**
 * Contexto que reciben las variantes de texto vía `custom`:
 * - swap: el texto cambió con la pleca YA al aire → fundido suave, sin máscara.
 * - out:  la pleca completa está saliendo → las líneas salen por su máscara.
 */
export interface TextCustom {
  swap: boolean
  out: boolean
  kind: "scripture" | "lyrics" | "info"
}

/**
 * Bloque de texto (título o subtítulo). Orquesta a sus líneas.
 * Primera entrada: las líneas emergen de su máscara en cascada.
 * Cambio de versículo: fundido cruzado con un leve desenfoque (estilo "dissolve" de TV).
 */
export function textBlock(delay: number, stagger: number): Variants {
  return {
    hidden: (c: TextCustom) => (c.swap ? { opacity: 0, filter: "blur(8px)", y: 6 } : { opacity: 1 }),
    visible: (c: TextCustom) =>
      c.swap
        ? {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            transition: { duration: 0.7, ease: ease.outQuart, delay: 0.12 },
            transitionEnd: { filter: "none" },
          }
        : { opacity: 1, transition: { delayChildren: delay, staggerChildren: stagger } },
    exit: (c: TextCustom) =>
      c.out
        ? { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
        : {
            opacity: 0,
            filter: ["blur(0px)", "blur(8px)"],
            y: -6,
            transition: { duration: 0.4, ease: ease.inOutSine },
          },
  }
}

/**
 * Línea de texto que emerge de una máscara (overflow:hidden en el padre).
 * Solo se mueve en la entrada/salida de la pleca; en un cambio de versículo
 * se queda quieta y el bloque hace el fundido.
 */
export function maskLine(enter: Transition = springs.textReveal): Variants {
  return {
    hidden: (c: TextCustom) => (c.swap ? { y: "0%", opacity: 1 } : { y: "115%", opacity: 0 }),
    visible: { y: "0%", opacity: 1, transition: enter },
    exit: (c: TextCustom) =>
      c.out ? { y: "-115%", opacity: 0, transition: { duration: 0.42, ease: ease.inOutCirc } } : { opacity: 1 },
  }
}
