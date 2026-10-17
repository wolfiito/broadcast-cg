import type { FollowMode } from "@/config/runtime"
import type { ContentKind } from "@/lib/freeshow/parseSlide"
import { SONG_CREDITS, type BrandSettings, type ConnectionStatus, type Settings, type SettingsPatch } from "@/store/useGraphicsStore"
import { isThemeId, type ThemeId } from "@/themes/types"

/**
 * Protocolo del relevo /cg-relay (server/cgRelay.ts) entre el control remoto y el CG.
 * Copia de los tipos en freeshow-remote/src/cg/types.ts: si cambias uno, cambia el otro.
 */
export const RELAY_PATH = "/cg-relay"

export type RelayCommand =
  | { type: "take" }
  | { type: "hide" }
  /** Texto manual (p. ej. nombre del predicador). `take` = sale al aire de inmediato. */
  | { type: "cue"; title: string; subtitle: string | undefined; kind?: ContentKind; take: boolean }
  | { type: "settings"; patch: SettingsPatch }

export interface StatusContent {
  title: string
  subtitle: string | undefined
  kind: ContentKind
}

/** Lo que el CG reporta al remoto. */
export interface CgStatusReport {
  isObs: boolean
  freeshow: ConnectionStatus
  onAir: boolean
  program: StatusContent | null
  preview: StatusContent | null
  followMode: FollowMode
  themeId: ThemeId
  themes: Array<{ id: ThemeId; label: string }>
  liveBug: boolean
  logoBug: boolean
  brand: BrandSettings
}

/* ── Validación: todo lo que llega por la red es no confiable ── */

const KINDS: readonly ContentKind[] = ["scripture", "lyrics", "info"]

/** Forma "cruda" de un objeto recibido: llaves conocidas, valores sin verificar. */
type Raw<K extends string> = { [P in K]?: unknown }

function asRaw<K extends string>(value: unknown): Raw<K> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Raw<K>) : undefined
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function num(value: unknown, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(value, max) : undefined
}

/** Quita las llaves `undefined` para que no pisen valores al fusionar. */
function compact<T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as { [K in keyof T]?: Exclude<T[K], undefined> }
}

export function sanitizeSettingsPatch(value: unknown): SettingsPatch {
  const raw = asRaw<"themeId" | "followMode" | "autoHideSeconds" | "clearHoldMs" | "songCredits" | "liveBug" | "brand">(value)
  if (!raw) return {}
  const out: SettingsPatch = {}

  if (typeof raw.themeId === "string" && isThemeId(raw.themeId)) out.themeId = raw.themeId
  if (raw.followMode === "auto" || raw.followMode === "manual") out.followMode = raw.followMode
  const autoHide = num(raw.autoHideSeconds, 3600)
  if (autoHide !== undefined) out.autoHideSeconds = Math.round(autoHide)
  const hold = num(raw.clearHoldMs, 10_000)
  if (hold !== undefined) out.clearHoldMs = Math.round(hold)
  if (typeof raw.songCredits === "string" && (SONG_CREDITS as readonly string[]).includes(raw.songCredits)) {
    out.songCredits = raw.songCredits as Settings["songCredits"]
  }

  const bug = asRaw<"enabled" | "label">(raw.liveBug)
  if (bug) {
    const liveBug = compact({ enabled: bool(bug.enabled), label: text(bug.label, 30) })
    if (Object.keys(liveBug).length) out.liveBug = liveBug
  }

  const b = asRaw<keyof BrandSettings>(raw.brand)
  if (b) {
    const brand: Partial<BrandSettings> = compact({
      accent: typeof b.accent === "string" && /^#[0-9a-f]{6}$/i.test(b.accent) ? b.accent : undefined,
      logoInPleca: bool(b.logoInPleca),
      logoBug: bool(b.logoBug),
      logoMono: bool(b.logoMono),
      churchName: text(b.churchName, 60),
      seriesLabel: text(b.seriesLabel, 80),
    })
    if (Object.keys(brand).length) out.brand = brand
  }

  return out
}

export function parseCommand(value: unknown): RelayCommand | null {
  const raw = asRaw<"type" | "title" | "subtitle" | "kind" | "take" | "patch">(value)
  if (!raw) return null
  switch (raw.type) {
    case "take":
    case "hide":
      return { type: raw.type }
    case "cue": {
      const title = text(raw.title, 300)?.trim()
      if (!title) return null
      const kind = KINDS.find((k) => k === raw.kind)
      return {
        type: "cue",
        title,
        subtitle: text(raw.subtitle, 200)?.trim() || undefined,
        take: raw.take === true,
        ...(kind ? { kind } : {}),
      }
    }
    case "settings":
      return { type: "settings", patch: sanitizeSettingsPatch(raw.patch) }
    default:
      return null
  }
}
