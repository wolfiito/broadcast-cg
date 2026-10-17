import { useEffect } from "react"
import { io } from "socket.io-client"
import { runtimeConfig } from "@/config/runtime"
import { RELAY_PATH, parseCommand, sanitizeSettingsPatch, type CgStatusReport, type StatusContent } from "@/lib/relay/protocol"
import { useGraphicsStore, type GraphicContent, type SettingsPatch } from "@/store/useGraphicsStore"
import { THEMES } from "@/themes/registry"
import { THEME_IDS } from "@/themes/types"

type GraphicsState = ReturnType<typeof useGraphicsStore.getState>

/** Agrupa cambios seguidos (p. ej. cue + take) en un solo reporte al remoto. */
const STATUS_THROTTLE_MS = 120

const THEME_LIST = THEME_IDS.map((id) => ({ id, label: THEMES[id].label }))

function toStatusContent(c: GraphicContent | null): StatusContent | null {
  return c ? { title: c.title, subtitle: c.subtitle, kind: c.kind } : null
}

function buildStatus(s: GraphicsState): CgStatusReport {
  return {
    isObs: runtimeConfig.isObs,
    freeshow: s.connection.status,
    onAir: s.onAir,
    program: toStatusContent(s.program),
    preview: toStatusContent(s.preview),
    followMode: s.followMode,
    themeId: s.themeId,
    themes: THEME_LIST,
    liveBug: s.liveBug.enabled,
    logoBug: s.brand.logoBug,
    brand: s.brand,
  }
}

/** Ajustes que cambiaron entre dos estados (los objetos anidados se mandan completos). */
function diffSettings(prev: GraphicsState, next: GraphicsState): SettingsPatch | null {
  const patch: SettingsPatch = {}
  if (next.themeId !== prev.themeId) patch.themeId = next.themeId
  if (next.followMode !== prev.followMode) patch.followMode = next.followMode
  if (next.autoHideSeconds !== prev.autoHideSeconds) patch.autoHideSeconds = next.autoHideSeconds
  if (next.clearHoldMs !== prev.clearHoldMs) patch.clearHoldMs = next.clearHoldMs
  if (next.songCredits !== prev.songCredits) patch.songCredits = next.songCredits
  if (next.liveBug !== prev.liveBug) patch.liveBug = next.liveBug
  if (next.brand !== prev.brand) patch.brand = next.brand
  return Object.keys(patch).length ? patch : null
}

/**
 * Conecta esta página con el relevo /cg-relay del servidor del CG:
 *  - aplica los comandos del control remoto (TAKE, OUT, texto manual, ajustes);
 *  - reporta su estado para que el remoto lo muestre;
 *  - si es el panel, replica sus cambios de ajustes a OBS (adiós a "Copiar URL" en cada cambio).
 */
export function useRelay(): void {
  useEffect(() => {
    // Abierto como archivo local en OBS no hay servidor con el cual hablar.
    if (!window.location.protocol.startsWith("http")) return

    const socket = io(window.location.origin, {
      path: RELAY_PATH,
      auth: { role: "cg", isObs: runtimeConfig.isObs },
      reconnectionDelayMax: 5000,
    })

    // Lo que llega del relevo no se reenvía (evita ecos entre páginas).
    let applyingRemote = false
    const applyRemote = (fn: () => void): void => {
      applyingRemote = true
      try {
        fn()
      } finally {
        applyingRemote = false
      }
    }

    let statusTimer: number | undefined
    const reportStatus = (): void => {
      window.clearTimeout(statusTimer)
      statusTimer = window.setTimeout(() => socket.emit("cg:status", buildStatus(useGraphicsStore.getState())), STATUS_THROTTLE_MS)
    }

    socket.on("connect", reportStatus)

    socket.on("cg:settings", (raw: unknown) => {
      const patch = sanitizeSettingsPatch(raw)
      applyRemote(() => useGraphicsStore.getState().applySettings(patch))
    })

    socket.on("cg:command", (raw: unknown) => {
      const cmd = parseCommand(raw)
      if (!cmd) return
      const store = useGraphicsStore.getState()
      applyRemote(() => {
        switch (cmd.type) {
          case "take":
            store.take()
            break
          case "hide":
            store.hide()
            break
          case "cue":
            store.cue(cmd)
            if (cmd.take) store.take()
            break
          case "settings":
            store.applySettings(cmd.patch)
            break
        }
      })
    })

    const unsubscribe = useGraphicsStore.subscribe((state, prev) => {
      const patch = diffSettings(prev, state)
      if (
        patch ||
        state.onAir !== prev.onAir ||
        state.program !== prev.program ||
        state.preview !== prev.preview ||
        state.connection.status !== prev.connection.status
      ) {
        reportStatus()
      }
      if (patch && runtimeConfig.panel && !applyingRemote) socket.emit("cg:command", { type: "settings", patch })
    })

    return () => {
      unsubscribe()
      window.clearTimeout(statusTimer)
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])
}
