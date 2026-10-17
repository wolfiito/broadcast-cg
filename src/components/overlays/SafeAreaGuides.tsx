/**
 * Guías de áreas seguras (SMPTE RP 2046-2 / EBU R 95):
 *  - Action safe: 93% (3.5% por lado)
 *  - Title safe:  90% (5% por lado) → todo texto debe quedar dentro.
 * Solo para operación: nunca activarlas al aire.
 */
export function SafeAreaGuides() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50" aria-hidden>
      <div className="absolute inset-[3.5%] border border-dashed border-cyan-400/60" />
      <div className="absolute inset-[5%] border border-amber-400/70" />
      <div className="absolute top-1/2 left-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 bg-white/40" />
      <div className="absolute top-1/2 left-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 bg-white/40" />
      <span className="absolute top-[5%] left-[5%] translate-y-1 pl-2 font-mono text-sm text-amber-300/80">TITLE SAFE 90%</span>
      <span className="absolute top-[3.5%] right-[3.5%] translate-y-1 pr-2 font-mono text-sm text-cyan-300/70">ACTION SAFE 93%</span>
    </div>
  )
}
