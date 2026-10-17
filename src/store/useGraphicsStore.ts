import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { runtimeConfig, type FollowMode } from "@/config/runtime"
import { isScriptureReference, type ContentKind, type SongCreditsMode } from "@/lib/freeshow/parseSlide"
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "@/themes/types"

/* ─────────────────────────────── Tipos ─────────────────────────────── */

export type GraphicSource = "freeshow" | "manual"

export interface GraphicContent {
  /** Hash del contenido: mismo texto = mismo id = no se re-anima. */
  id: string
  title: string
  subtitle: string | undefined
  kind: ContentKind
  source: GraphicSource
}

export type IncomingContent = Pick<GraphicContent, "title" | "subtitle" | "kind">

export type ConnectionStatus = "disabled" | "connecting" | "connected" | "unauthorized" | "error" | "disconnected"

export interface ConnectionState {
  status: ConnectionStatus
  url: string
  error: string | undefined
  lastMessageAt: number | undefined
}

export interface BrandSettings {
  /** Color de acento de la iglesia (líneas, detalles). */
  accent: string
  /** Muestra el logo dentro de la pleca. */
  logoInPleca: boolean
  /** Logo como marca de agua en una esquina (sustituye al típico "bug" de canal). */
  logoBug: boolean
  /** Fuerza el logo a blanco: ideal sobre fondos oscuros si el logo original es de color. */
  logoMono: boolean
  /** Nombre de la iglesia (algunos temas lo muestran como firma). */
  churchName: string
  /** Leyenda de la serie del mes, p. ej. "Lucas · Octubre". Vacío = no se muestra. */
  seriesLabel: string
}

export interface Settings {
  themeId: ThemeId
  /**
   * auto   → lo que FreeShow manda sale AL AIRE de inmediato.
   * manual → lo que FreeShow manda queda en PREVIEW y el operador hace TAKE.
   */
  followMode: FollowMode
  /** Oculta la pleca tras N segundos sin cambios. 0 = desactivado. */
  autoHideSeconds: number
  /**
   * Si FreeShow limpia la salida y vuelve a mandar texto antes de este tiempo,
   * la pleca NO sale: solo cambia el texto. Evita el "sale/entra" entre versículos.
   */
  clearHoldMs: number
  songCredits: SongCreditsMode
  showSafeAreas: boolean
  liveBug: { enabled: boolean; label: string }
  brand: BrandSettings
}

interface GraphicsState extends Settings {
  connection: ConnectionState
  /** Bus PREVIEW: lo siguiente que saldrá al aire. */
  preview: GraphicContent | null
  /** Bus PROGRAM: lo que está (o estuvo por última vez) al aire. */
  program: GraphicContent | null
  /** Visibilidad del gráfico al aire. Separado de `program` para permitir la animación de salida. */
  onAir: boolean

  setConnection: (patch: Partial<ConnectionState>) => void
  /** Entrada desde FreeShow. `null` = FreeShow limpió la salida. */
  ingestRemote: (content: IncomingContent | null) => void
  cue: (content: { title: string; subtitle: string | undefined; kind?: ContentKind }) => void
  take: () => void
  hide: () => void
  toggle: () => void

  setTheme: (id: ThemeId) => void
  setFollowMode: (mode: FollowMode) => void
  setAutoHideSeconds: (seconds: number) => void
  setClearHoldMs: (ms: number) => void
  setSongCredits: (mode: SongCreditsMode) => void
  toggleSafeAreas: () => void
  setLiveBug: (patch: Partial<Settings["liveBug"]>) => void
  setBrand: (patch: Partial<BrandSettings>) => void
  /** Aplica ajustes parciales ya validados (control remoto o panel de otra página). */
  applySettings: (patch: SettingsPatch) => void
}

/* ─────────────────────────────── Helpers ─────────────────────────────── */

/** Hash djb2: barato, estable y suficiente para usar como key de React. */
function contentId(...parts: Array<string | undefined>): string {
  const input = parts.map((p) => p ?? "").join("\u0000")
  let hash = 5381
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0
  return (hash >>> 0).toString(36)
}

function makeContent({ title, subtitle, kind }: IncomingContent, source: GraphicSource): GraphicContent {
  const t = title.trim()
  const s = subtitle?.trim() || undefined
  return { id: contentId(kind, t, s), title: t, subtitle: s, kind, source }
}

/* ── Configuración por URL ──────────────────────────────────────────────
   OBS tiene su propio navegador interno: NO ve lo que guardaste en Chrome.
   Por eso el panel genera una URL con TODA la configuración y la Browser Source
   la lee de ahí. Los parámetros de URL siempre ganan sobre lo guardado. */

type UrlSettings = Partial<Omit<Settings, "brand" | "liveBug">> & {
  brand?: Partial<BrandSettings>
  liveBug?: Partial<Settings["liveBug"]>
}

/** Ajustes parciales que llegan del control remoto (ver lib/relay/protocol.ts). */
export type SettingsPatch = UrlSettings

export const SONG_CREDITS: readonly SongCreditsMode[] = ["always", "first", "never"]

function urlOverrides(search: string = window.location.search): UrlSettings {
  const p = new URLSearchParams(search)
  const bool = (key: string): boolean | undefined => (p.has(key) ? p.get(key) === "1" : undefined)
  const num = (key: string): number | undefined => {
    const n = Number(p.get(key))
    return p.has(key) && Number.isFinite(n) && n >= 0 ? n : undefined
  }

  const o: UrlSettings = {}
  if (runtimeConfig.theme) o.themeId = runtimeConfig.theme
  if (runtimeConfig.follow) o.followMode = runtimeConfig.follow

  const hold = num("hold")
  if (hold !== undefined) o.clearHoldMs = hold
  const autohide = num("autohide")
  if (autohide !== undefined) o.autoHideSeconds = autohide
  const credits = p.get("credits")
  if (credits && (SONG_CREDITS as readonly string[]).includes(credits)) o.songCredits = credits as SongCreditsMode

  const brand: Partial<BrandSettings> = {}
  const accent = p.get("accent")
  if (accent && /^[0-9a-f]{6}$/i.test(accent)) brand.accent = `#${accent}`
  const logoPleca = bool("logoPleca")
  if (logoPleca !== undefined) brand.logoInPleca = logoPleca
  const logoBug = bool("logoBug")
  if (logoBug !== undefined) brand.logoBug = logoBug
  const logoMono = bool("logoMono")
  if (logoMono !== undefined) brand.logoMono = logoMono
  const church = p.get("iglesia")
  if (church !== null) brand.churchName = church.slice(0, 60)
  const series = p.get("serie")
  if (series !== null) brand.seriesLabel = series.slice(0, 80)
  if (Object.keys(brand).length) o.brand = brand

  const bug = bool("bug")
  if (bug !== undefined) o.liveBug = { enabled: bug }

  return o
}

/** Combina defaults + guardado + URL, fusionando los objetos anidados. */
function mergeSettings(base: Settings, ...layers: Array<UrlSettings | undefined>): Settings {
  let out = base
  for (const layer of layers) {
    if (!layer) continue
    out = {
      ...out,
      ...layer,
      brand: { ...out.brand, ...layer.brand },
      liveBug: { ...out.liveBug, ...layer.liveBug },
    }
  }
  return out
}

/** URL de una pantalla completa ("Comenzamos pronto" / "Gracias") para su propia escena de OBS. */
export function buildScreenUrl(s: Settings, screen: "inicio" | "fin", hora?: string): string {
  const url = new URL(buildObsUrl(s))
  const keep = new URLSearchParams()
  keep.set("screen", screen)
  if (screen === "inicio" && hora) keep.set("hora", hora)
  for (const key of ["iglesia", "serie"]) {
    const v = url.searchParams.get(key)
    if (v) keep.set(key, v)
  }
  url.search = keep.toString()
  return url.toString()
}

/** URL lista para pegar en la Browser Source de OBS, con la configuración actual. */
export function buildObsUrl(s: Settings, base: string = window.location.href): string {
  const url = new URL(base)
  url.search = ""
  const q = url.searchParams
  q.set("theme", s.themeId)
  q.set("host", runtimeConfig.host)
  q.set("port", String(runtimeConfig.port))
  if (s.followMode !== "auto") q.set("follow", s.followMode)
  q.set("accent", s.brand.accent.replace("#", ""))
  q.set("logoPleca", s.brand.logoInPleca ? "1" : "0")
  q.set("logoBug", s.brand.logoBug ? "1" : "0")
  q.set("logoMono", s.brand.logoMono ? "1" : "0")
  if (s.brand.churchName) q.set("iglesia", s.brand.churchName)
  if (s.brand.seriesLabel) q.set("serie", s.brand.seriesLabel)
  q.set("hold", String(s.clearHoldMs))
  q.set("credits", s.songCredits)
  if (s.autoHideSeconds > 0) q.set("autohide", String(s.autoHideSeconds))
  if (s.liveBug.enabled) q.set("bug", "1")
  const logo = new URLSearchParams(window.location.search).get("logo")
  if (logo) q.set("logo", logo)
  return url.toString()
}

const defaults: Settings = {
  themeId: DEFAULT_THEME_ID,
  followMode: "auto",
  autoHideSeconds: 0,
  clearHoldMs: 700,
  songCredits: "first",
  showSafeAreas: false,
  liveBug: { enabled: false, label: "EN VIVO" },
  brand: { accent: "#c9a96e", logoInPleca: true, logoBug: true, logoMono: true, churchName: "", seriesLabel: "" },
}

/* ─────────────────────────────── Store ─────────────────────────────── */

export const useGraphicsStore = create<GraphicsState>()(
  persist(
    (set, get) => ({
      ...mergeSettings(defaults, urlOverrides()),

      connection: {
        status: runtimeConfig.offline ? "disabled" : "connecting",
        url: `http://${runtimeConfig.host}:${runtimeConfig.port}`,
        error: undefined,
        lastMessageAt: undefined,
      },
      preview: null,
      program: null,
      onAir: false,

      setConnection: (patch) => set((s) => ({ connection: { ...s.connection, ...patch } })),

      ingestRemote: (incoming) => {
        const { followMode, program, onAir } = get()

        if (incoming === null) {
          // FreeShow limpió la salida: en auto bajamos el gráfico; en manual solo vaciamos preview.
          if (followMode === "auto") {
            if (onAir) set({ onAir: false })
          } else {
            set({ preview: null })
          }
          return
        }

        const next = makeContent(incoming, "freeshow")
        if (followMode === "auto") {
          if (onAir && program?.id === next.id) return // mismo contenido: no re-animar
          set({ program: next, onAir: true })
        } else {
          set({ preview: next })
        }
      },

      cue: ({ title, subtitle, kind }) => {
        if (!title.trim()) return
        const resolvedKind = kind ?? (subtitle && isScriptureReference(subtitle) ? "scripture" : "info")
        set({ preview: makeContent({ title, subtitle, kind: resolvedKind }, "manual") })
      },

      take: () => {
        const { preview, program, onAir } = get()
        if (preview) {
          if (onAir && program?.id === preview.id) return
          set({ program: preview, onAir: true })
        } else if (program && !onAir) {
          set({ onAir: true }) // re-entrada del último gráfico
        }
      },

      hide: () => set({ onAir: false }),

      toggle: () => {
        if (get().onAir) get().hide()
        else get().take()
      },

      setTheme: (themeId) => set({ themeId }),
      setFollowMode: (followMode) => set({ followMode }),
      setAutoHideSeconds: (seconds) => set({ autoHideSeconds: Math.max(0, Math.round(seconds)) }),
      setClearHoldMs: (ms) => set({ clearHoldMs: Math.max(0, Math.round(ms)) }),
      setSongCredits: (songCredits) => set({ songCredits }),
      toggleSafeAreas: () => set((s) => ({ showSafeAreas: !s.showSafeAreas })),
      setLiveBug: (patch) => set((s) => ({ liveBug: { ...s.liveBug, ...patch } })),
      setBrand: (patch) => set((s) => ({ brand: { ...s.brand, ...patch } })),
      applySettings: (patch) => set((s) => mergeSettings(s, patch)),
    }),
    {
      name: "broadcast-cg:settings",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // Solo persistimos preferencias; nunca contenido al aire ni estado de conexión.
      partialize: (s): Settings => ({
        themeId: s.themeId,
        followMode: s.followMode,
        autoHideSeconds: s.autoHideSeconds,
        clearHoldMs: s.clearHoldMs,
        songCredits: s.songCredits,
        showSafeAreas: s.showSafeAreas,
        liveBug: s.liveBug,
        brand: s.brand,
      }),
      // v1 → v2: se agregaron ajustes; v2 → v3: logoBug activo por defecto
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<Settings>
        if (version < 3 && p.brand) {
          p.brand.logoBug = true
        }
        return p
      },
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as UrlSettings
        const merged = { ...current, ...mergeSettings(current, saved, urlOverrides()) }
        // Un tema guardado que ya no existe (p. ej. "news") cae al tema por defecto.
        if (!isThemeId(merged.themeId)) merged.themeId = DEFAULT_THEME_ID
        return merged
      },
    },
  ),
)
