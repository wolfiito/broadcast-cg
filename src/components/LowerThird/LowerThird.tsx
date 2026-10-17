import { AnimatePresence, motion, useIsPresent, type Variants } from "framer-motion"
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import type { ContentKind } from "@/lib/freeshow/parseSlide"
import { useGraphicsStore, type GraphicContent } from "@/store/useGraphicsStore"
import { RESIZE_TRANSITION, textBlock, type TextCustom } from "@/themes/motion"
import { useTheme } from "@/themes/ThemeProvider"
import type { ThemeDefinition } from "@/themes/types"
import styles from "./LowerThird.module.css"

/* ───────────────────────────── Preparación del texto ─────────────────────────────
   Los saltos de línea de FreeShow responden al ancho de SU pantalla, no al de la pleca. */

export function layoutLines(text: string, kind: ContentKind): string[] {
  const lines = text.split("\n").filter(Boolean)
  // Versículo: un solo párrafo que se re-acomoda al ancho de la pleca.
  if (kind === "scripture") return [lines.join(" ")]
  // Canción: máximo 2 renglones visuales → se unen de dos en dos (4 líneas cortas = 2 renglones).
  if (kind === "lyrics" && lines.length > 2) {
    const half = Math.ceil(lines.length / 2)
    return [lines.slice(0, half).join(" "), lines.slice(half).join(" ")]
  }
  return lines
}

/** Números de versículo ("16 Porque…", "…venir, 39 ni lo alto") → superíndice discreto.
 * Requiere inicio de texto o puntuación previa para evitar falsos positivos con cantidades ("tenía 30 años", "12 discípulos").
 */
const VERSE_NUMBER_RE = /(^|[\n\r.,!?;:()\[\]"”»]\s*)(\d{1,3})\s+(?=\p{L})/gu

export function renderScripture(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(VERSE_NUMBER_RE)) {
    const [whole, lead = "", num = ""] = match
    const start = match.index
    out.push(text.slice(last, start) + lead)
    out.push(
      <sup key={start} className={styles["verse"]}>
        {num}
      </sup>,
    )
    last = start + whole.length
  }
  out.push(text.slice(last))
  return out
}

/* ───────────────────────────── Auto-ajuste de tamaño ─────────────────────────────
   Cada tema declara en CSS: --fit-max-height (alto máximo) y --fit-min (letra mínima).
   Si el texto no cabe, se busca (binaria) el mayor tamaño que sí quepa.
   Usa offsetHeight (layout real), así no le afecta el escalado del lienzo ni las animaciones. */

function fitText(el: HTMLElement): void {
  el.style.fontSize = ""
  const cs = getComputedStyle(el)
  const maxHeight = parseFloat(cs.getPropertyValue("--fit-max-height"))
  if (!Number.isFinite(maxHeight) || el.offsetHeight <= maxHeight) return

  const base = parseFloat(cs.fontSize)
  const min = parseFloat(cs.getPropertyValue("--fit-min")) || base * 0.55
  let lo = min
  let hi = base
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    el.style.fontSize = `${mid}px`
    if (el.offsetHeight <= maxHeight) lo = mid
    else hi = mid
  }
  el.style.fontSize = `${Math.floor(lo)}px`
}

/* ───────────────────────────── Alto animado ─────────────────────────────
   Cuando cambia el versículo, la caja crece/encoge suavemente en vez de "brincar". */

function AutoHeight({ className, children }: { className: string; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | "auto">("auto")

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    setHeight(el.offsetHeight)
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div className={className} initial={false} animate={{ height }} transition={RESIZE_TRANSITION}>
      <div ref={innerRef}>{children}</div>
    </motion.div>
  )
}

/* ───────────────────────────── Línea enmascarada ───────────────────────────── */

const cx = (...classes: Array<string | false | undefined>): string => classes.filter(Boolean).join(" ")

interface MaskedLineProps {
  className?: string
  variants: Variants
  custom: TextCustom
  children: ReactNode
}

/** El span exterior recorta (overflow:hidden); el interior es el que se anima. */
function MaskedLine({ className, variants, custom, children }: MaskedLineProps) {
  return (
    <span className={styles["mask"]}>
      <motion.span className={cx(styles["line"], className)} variants={variants} custom={custom}>
        {children}
      </motion.span>
    </span>
  )
}

/* ───────────────────────────── Gráfico ───────────────────────────── */

interface GraphicProps {
  theme: ThemeDefinition
  content: GraphicContent
}

/**
 * Una instancia = una "entrada al aire". Se monta con IN y se desmonta (animando) con OUT.
 * Mientras está al aire, los cambios de texto NO re-animan la caja:
 *   - título y subtítulo hacen fundido cruzado por separado (si la cita no cambia, no se mueve),
 *   - la caja ajusta su alto con una transición suave.
 */
function LowerThirdGraphic({ theme, content }: GraphicProps) {
  const { classes, motion: m } = theme
  const isPresent = useIsPresent()
  const logoInPleca = useGraphicsStore((s) => s.brand.logoInPleca)

  // El primer contenido entra sincronizado con la caja; los siguientes son "swap" (fundido).
  const [firstContentId] = useState(content.id)
  const custom: TextCustom = { swap: content.id !== firstContentId, out: !isPresent, kind: content.kind }
  // Para los bloques que SALEN durante un swap (fundido).
  const exitCustom: TextCustom = { swap: true, out: false, kind: content.kind }
  // Cuando la pleca completa sale, el texto pasa a "exit" (sale por su máscara) mientras la caja espera.
  const blockState = isPresent ? "visible" : "exit"

  const titleBlock = useMemo(() => textBlock(m.timing.enterDelay, m.timing.lineStagger), [m])
  const subtitleBlock = useMemo(() => textBlock(m.timing.enterDelay + m.timing.subtitleDelay, 0), [m])
  const lines = useMemo(() => layoutLines(content.title, content.kind), [content.title, content.kind])

  // Se ejecuta al montar cada título, antes del primer frame: el texto nunca se ve "desbordado".
  const fitRef = useCallback((el: HTMLDivElement | null) => {
    if (el) fitText(el)
  }, [])

  return (
    <div className={classes.stage} data-kind={content.kind}>
      <motion.div className={classes.box} variants={m.box} custom={content.kind} initial="hidden" animate="visible" exit="exit">
        <div className={classes.panel}>
          {logoInPleca && classes.logo && <BrandLogo className={classes.logo} />}
          {classes.accent && <motion.span aria-hidden className={classes.accent} variants={m.accent} />}

          <AutoHeight className={classes.content}>
            {/* popLayout: el texto saliente se superpone al entrante → fundido cruzado real. */}
            <div className={styles["slot"]}>
              <AnimatePresence mode="popLayout" custom={exitCustom}>
                <motion.div
                  key={`${content.kind}:${content.title}`}
                  variants={titleBlock}
                  custom={custom}
                  initial="hidden"
                  animate={blockState}
                  exit="exit"
                >
                  <div ref={fitRef} className={classes.title}>
                    {lines.map((line, i) => (
                      <MaskedLine key={i} variants={m.line} custom={custom}>
                        {content.kind === "scripture" ? renderScripture(line) : line}
                      </MaskedLine>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={styles["slot"]}>
              <AnimatePresence mode="popLayout" custom={exitCustom}>
                {content.subtitle && (
                  <motion.div
                    key={content.subtitle}
                    variants={subtitleBlock}
                    custom={custom}
                    initial="hidden"
                    animate={blockState}
                    exit="exit"
                  >
                    <MaskedLine className={classes.subtitle} variants={m.subtitleLine ?? m.line} custom={custom}>
                      {content.subtitle}
                    </MaskedLine>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AutoHeight>

          {theme.Decor && <theme.Decor kind={content.kind} />}
        </div>
      </motion.div>
    </div>
  )
}

/* ───────────────────────────── Contenedor público ───────────────────────────── */

/**
 * Pleca dinámica. Lee PROGRAM del store y el tema activo del ThemeProvider.
 * - IN/OUT: AnimatePresence monta/desmonta el gráfico con sus variantes.
 * - Cambio de tema o de tipo (versículo → canción): sale y entra con el nuevo diseño.
 * - El texto se renderiza como nodo de texto de React (escapado): nunca innerHTML.
 */
export function LowerThird() {
  const theme = useTheme()
  const onAir = useGraphicsStore((s) => s.onAir)
  const program = useGraphicsStore((s) => s.program)

  return (
    <AnimatePresence mode="wait">
      {onAir && program && <LowerThirdGraphic key={`${theme.id}:${program.kind}`} theme={theme} content={program} />}
    </AnimatePresence>
  )
}
