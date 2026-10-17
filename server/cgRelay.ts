import type { IncomingMessage, Server as HttpServer } from "node:http"
import type { PreviewServer, Plugin, ViteDevServer } from "vite"
import { Server } from "socket.io"
import { createObsClient, type ObsClient, type ObsState } from "./obsClient"

/**
 * Relevo entre el control remoto (celular) y las páginas del CG (OBS y panel).
 *
 *   remoto ──cg:command──▶ relevo ──cg:command──▶ CG (OBS, panel)
 *   remoto ◀──cg:status─── relevo ◀──cg:status─── CG
 *   remoto ──obs:scene───▶ relevo ──obs-websocket──▶ OBS
 *
 * Vive en el mismo servidor de Vite (dev y preview), en la ruta /cg-relay.
 */
export const RELAY_PATH = "/cg-relay"

export interface CgRelayOptions {
  /** ws://host:4455, o "off" para no controlar escenas de OBS. */
  obsUrl: string
  /** Contraseña de obs-websocket. Solo se usa aquí, en el servidor; nunca va al navegador. */
  obsPassword: string | undefined
}

type Json = Record<string, unknown>

const COMMAND_TYPES = new Set(["take", "hide", "cue", "settings"])
/** Solo estos ajustes se guardan en el relevo; cualquier otra llave se descarta. */
const SETTING_KEYS = new Set(["themeId", "followMode", "autoHideSeconds", "clearHoldMs", "songCredits", "liveBug", "brand"])

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Solo red local: evita que una página web cualquiera abierta en esta PC controle el CG. */
function isLocalOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const host = new URL(origin).hostname.replace(/^\[|\]$/g, "")
    return (
      host === "localhost" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    )
  } catch {
    return false
  }
}

function attach(httpServer: ViteDevServer["httpServer"] | PreviewServer["httpServer"], options: CgRelayOptions): void {
  if (!httpServer) return

  const io = new Server(httpServer as HttpServer, {
    path: RELAY_PATH,
    maxHttpBufferSize: 64 * 1024,
    allowRequest: (req, callback) => callback(null, isLocalOrigin(req)),
    // Sin esto Socket.IO cerraría el WebSocket de recarga en caliente de Vite.
    destroyUpgrade: false,
  })

  /** Últimos ajustes enviados: una página de OBS que se recarga los recupera al conectar. */
  const settings: Json = {}
  const cgStatus = new Map<string, { status: unknown; isObs: boolean; at: number }>()
  let obsState: ObsState = {
    status: "disabled",
    scenes: [],
    current: null,
    error: options.obsUrl === "off" ? "Desactivado (OBS_WS_URL=off)" : undefined,
  }

  const mergeSettings = (patch: Json): void => {
    for (const [key, value] of Object.entries(patch)) {
      if (!SETTING_KEYS.has(key)) continue
      const prev = settings[key]
      settings[key] = isRecord(value) && isRecord(prev) ? { ...prev, ...value } : value
    }
  }

  /** Se reporta al remoto el estado de la página de OBS; si no hay, el de la más reciente (panel). */
  const pickStatus = (): unknown => {
    let best: { status: unknown; isObs: boolean; at: number } | undefined
    for (const entry of cgStatus.values()) {
      if (!best || (entry.isObs && !best.isObs) || (entry.isObs === best.isObs && entry.at > best.at)) best = entry
    }
    return best?.status ?? null
  }

  const pushStatus = (): void => {
    io.to("remote").emit("cg:status", pickStatus())
  }

  let obs: ObsClient | undefined
  if (options.obsUrl !== "off") {
    obs = createObsClient({
      url: options.obsUrl,
      password: options.obsPassword,
      onState: (state) => {
        obsState = state
        io.to("remote").emit("obs:state", state)
      },
    })
  }

  io.on("connection", (socket) => {
    const auth: Json = isRecord(socket.handshake.auth) ? socket.handshake.auth : {}

    if (auth.role === "cg") {
      const isObs = auth.isObs === true
      void socket.join("cg")
      if (Object.keys(settings).length) socket.emit("cg:settings", settings)

      socket.on("cg:status", (status: unknown) => {
        cgStatus.set(socket.id, { status, isObs, at: Date.now() })
        pushStatus()
      })
      // Ajustes cambiados en el panel del CG: se replican a OBS y a las demás páginas.
      socket.on("cg:command", (cmd: unknown) => {
        if (!isRecord(cmd) || cmd.type !== "settings" || !isRecord(cmd.patch)) return
        mergeSettings(cmd.patch)
        socket.to("cg").emit("cg:command", cmd)
      })
      socket.on("disconnect", () => {
        cgStatus.delete(socket.id)
        pushStatus()
      })
      return
    }

    void socket.join("remote")
    socket.emit("cg:status", pickStatus())
    socket.emit("obs:state", obsState)

    socket.on("cg:command", (cmd: unknown) => {
      if (!isRecord(cmd) || typeof cmd.type !== "string" || !COMMAND_TYPES.has(cmd.type)) return
      if (cmd.type === "settings" && isRecord(cmd.patch)) mergeSettings(cmd.patch)
      io.to("cg").emit("cg:command", cmd)
    })

    socket.on("obs:scene", (name: unknown, ack?: (res: { ok: boolean; error?: string }) => void) => {
      const reply = typeof ack === "function" ? ack : () => undefined
      if (!obs) return reply({ ok: false, error: "Control de OBS desactivado" })
      if (typeof name !== "string" || !obsState.scenes.includes(name)) return reply({ ok: false, error: "Escena desconocida" })
      obs.setScene(name).then(
        () => reply({ ok: true }),
        (err: Error) => reply({ ok: false, error: err.message }),
      )
    })
  })

  httpServer.on("close", () => {
    obs?.close()
    io.disconnectSockets(true)
  })
}

export function cgRelay(options: CgRelayOptions): Plugin {
  return {
    name: "cg-relay",
    configureServer: (server) => attach(server.httpServer, options),
    configurePreviewServer: (server) => attach(server.httpServer, options),
  }
}
