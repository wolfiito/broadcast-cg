import type { Variants } from "framer-motion"
import type { ComponentType } from "react"
import type { ContentKind } from "@/lib/freeshow/parseSlide"

export const THEME_IDS = ["otono", "pizarra"] as const
export type ThemeId = (typeof THEME_IDS)[number]
export const DEFAULT_THEME_ID: ThemeId = "pizarra"

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value)
}

/**
 * Contrato de clases que cada tema inyecta en el árbol del LowerThird.
 * Estructura DOM (de afuera hacia adentro):
 *
 *   stage    → posición en el lienzo 1920×1080. Lleva data-kind = scripture | lyrics | info
 *   box      → envoltura ANIMADA (clip-path, transform, filter). No poner fondo aquí.
 *   panel    → forma/fondo visual del tema (CSS puro)
 *   logo     → logo de la iglesia (opcional; si la clase está vacía no se muestra)
 *   accent   → elemento decorativo animado (filete, línea…)
 *   content  → contenedor de texto (su alto se anima al cambiar de versículo)
 *   title    → texto principal. Variables CSS para auto-ajuste:
 *                --fit-max-height  alto máximo permitido (px)
 *                --fit-min         tamaño mínimo de letra (px)
 *   subtitle → cita, créditos o cargo
 */
export interface ThemeClasses {
  stage: string
  box: string
  panel: string
  logo: string
  accent: string
  content: string
  title: string
  subtitle: string
}

/** Tiempos de entrada del texto (primera vez que la pleca sale al aire). */
export interface TextTiming {
  /** Retardo desde que empieza a abrir la caja. */
  enterDelay: number
  /** Desfase entre líneas del título. */
  lineStagger: number
  /** Retardo adicional del subtítulo respecto al título. */
  subtitleDelay: number
}

/** Variantes de Framer Motion por capa. Etiquetas: hidden / visible / exit. */
export interface ThemeMotion {
  box: Variants
  accent: Variants
  /** Línea enmascarada. Recibe `custom: TextCustom` (ver motion.ts). */
  line: Variants
  subtitleLine?: Variants
  timing: TextTiming
}

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  classes: ThemeClasses
  motion: ThemeMotion
  /**
   * Decoración propia del tema (ornamentos SVG, firma, leyenda de la serie).
   * Se renderiza dentro del panel, después del texto; hereda las variantes
   * hidden/visible/exit de la caja, así que puede animarse (p. ej. trazos que se dibujan).
   */
  Decor?: ComponentType<{ kind: ContentKind }>
}

/** Convierte un CSS Module en el contrato ThemeClasses (clases faltantes = cadena vacía). */
export function fromCssModule(styles: CSSModuleClasses): ThemeClasses {
  const c = (key: keyof ThemeClasses): string => styles[key] ?? ""
  return {
    stage: c("stage"),
    box: c("box"),
    panel: c("panel"),
    logo: c("logo"),
    accent: c("accent"),
    content: c("content"),
    title: c("title"),
    subtitle: c("subtitle"),
  }
}
