import { AnimatePresence, motion, type Variants } from "framer-motion"
import { useEffect, useState } from "react"
import { FlowLines, LeafBranch } from "@/components/ornaments/Botanical"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import { ease, springs } from "@/themes/motion"
import styles from "./HoldingScreen.module.css"

/*
 * Pantallas completas para escenas propias de OBS:
 *   ?screen=inicio&hora=11:00     → "Comenzamos pronto" con cuenta regresiva hasta las 11:00
 *   ?screen=inicio&minutos=10     → cuenta regresiva de 10 minutos desde que carga la fuente
 *   ?screen=inicio                → sin cuenta regresiva
 *   ?screen=fin                   → "Gracias por acompañarnos"
 */

export type ScreenKind = "inicio" | "fin"

export function readScreenParam(): ScreenKind | null {
  const v = new URLSearchParams(window.location.search).get("screen")
  return v === "inicio" || v === "fin" ? v : null
}

const cls = (key: string): string => styles[key] ?? ""

/** Hora objetivo: `hora=HH:MM` (hoy) o `minutos=N` desde la carga. */
function resolveTarget(): number | null {
  const p = new URLSearchParams(window.location.search)
  const hora = p.get("hora")
  const match = hora ? /^(\d{1,2}):(\d{2})$/.exec(hora) : null
  if (match) {
    const d = new Date()
    d.setHours(Number(match[1]), Number(match[2]), 0, 0)
    return d.getTime()
  }
  const minutos = Number(p.get("minutos"))
  return Number.isFinite(minutos) && minutos > 0 ? Date.now() + minutos * 60_000 : null
}

function useCountdown(target: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (target === null) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [target])
  return target === null ? null : Math.max(0, Math.ceil((target - now) / 1000))
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const reveal: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: (i: number) => ({ y: "0%", opacity: 1, transition: { ...springs.soft, delay: 0.4 + i * 0.18 } }),
}

const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 1.2, ease: ease.outQuart, delay: 0.9 + i * 0.2 } }),
}

function Line({ i, className, children }: { i: number; className?: string; children: string }) {
  return (
    <span className={cls("mask")}>
      <motion.span className={[cls("line"), className].filter(Boolean).join(" ")} variants={reveal} custom={i}>
        {children}
      </motion.span>
    </span>
  )
}

export function HoldingScreen({ kind }: { kind: ScreenKind }) {
  const churchName = useGraphicsStore((s) => s.brand.churchName)
  const seriesLabel = useGraphicsStore((s) => s.brand.seriesLabel)
  const [target] = useState(resolveTarget)
  const remaining = useCountdown(kind === "inicio" ? target : null)
  const byline = [churchName, seriesLabel].filter(Boolean).join(" · ")

  return (
    <motion.div className={cls("screen")} initial="hidden" animate="visible">
      <div className={cls("glow")} />
      <div className={cls("grain")} />

      {kind === "inicio" ? (
        <>
          <LeafBranch className={cls("leafRightSoft")} standalone baseDelay={0.6} />
          <LeafBranch className={cls("leafRight")} standalone baseDelay={0.3} />
          <div className={cls("center")}>
            <h1 className={cls("title")}>
              <Line i={0}>Comenzamos pronto</Line>
            </h1>

            {remaining !== null && (
              <motion.div variants={fade} custom={0}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={remaining > 0 ? "count" : "done"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    {remaining > 0 ? (
                      <div className={cls("countdown")}>{formatSeconds(remaining)}</div>
                    ) : (
                      <div className={cls("countdown")}>En unos momentos</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

            {byline && (
              <motion.p className={cls("byline")} variants={fade} custom={1}>
                {byline}
              </motion.p>
            )}
          </div>
        </>
      ) : (
        <>
          <FlowLines className={cls("flowLeft")} standalone />
          <div className={cls("blob")} />
          <LeafBranch className={cls("leafRight")} standalone baseDelay={0.5} />
          <div className={cls("center")}>
            <h1 className={[cls("title"), cls("titleBold")].join(" ")}>
              <Line i={0}>Gracias por</Line>
              <Line i={1}>acompañarnos</Line>
            </h1>
            {seriesLabel && (
              <motion.p className={[cls("byline"), cls("bylineOcre")].join(" ")} variants={fade} custom={0}>
                {seriesLabel}
              </motion.p>
            )}
          </div>
          {churchName && (
            <motion.p className={cls("signature")} variants={fade} custom={1}>
              {churchName}
            </motion.p>
          )}
        </>
      )}
    </motion.div>
  )
}
