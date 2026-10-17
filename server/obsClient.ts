import { createHash, randomUUID } from "node:crypto"
import WebSocket from "ws"

export type ObsStatus = "disabled" | "connecting" | "connected" | "unauthorized" | "error"

export interface ObsState {
  status: ObsStatus
  /** Escenas en el orden en que OBS las muestra (de arriba hacia abajo). */
  scenes: string[]
  current: string | null
  error: string | undefined
}

export interface ObsClientOptions {
  url: string
  /** Contraseña de obs-websocket. Viene de OBS_WS_PASSWORD en .env.local (no se versiona). */
  password: string | undefined
  onState: (state: ObsState) => void
}

export interface ObsClient {
  getState: () => ObsState
  setScene: (sceneName: string) => Promise<void>
  close: () => void
}

const RECONNECT_MS = 5000
const REQUEST_TIMEOUT_MS = 4000
/** EventSubscription.Scenes de obs-websocket v5 (1 << 2). */
const EVENTS_SCENES = 1 << 2
/** Código de cierre de obs-websocket cuando la contraseña es incorrecta. */
const CLOSE_AUTH_FAILED = 4009

const OP = { Hello: 0, Identify: 1, Identified: 2, Event: 5, Request: 6, RequestResponse: 7 } as const

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sha256Base64(text: string): string {
  return createHash("sha256").update(text).digest("base64")
}

/**
 * Cliente mínimo de obs-websocket v5 (OBS 28+): lista de escenas y cambio de escena en PROGRAM.
 * Corre en el servidor del CG para que la contraseña nunca llegue al navegador.
 */
export function createObsClient({ url, password, onState }: ObsClientOptions): ObsClient {
  let state: ObsState = { status: "connecting", scenes: [], current: null, error: undefined }
  let ws: WebSocket | undefined
  let reconnectTimer: NodeJS.Timeout | undefined
  let lastError: string | undefined
  let closed = false
  const pending = new Map<string, { resolve: (data: Json) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>()

  const update = (patch: Partial<ObsState>): void => {
    state = { ...state, ...patch }
    onState(state)
  }

  const send = (op: number, d: unknown): void => {
    ws?.send(JSON.stringify({ op, d }))
  }

  const request = (requestType: string, requestData?: Json): Promise<Json> =>
    new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN || state.status !== "connected") {
        reject(new Error("OBS no está conectado"))
        return
      }
      const requestId = randomUUID()
      const timer = setTimeout(() => {
        pending.delete(requestId)
        reject(new Error(`${requestType}: OBS no respondió`))
      }, REQUEST_TIMEOUT_MS)
      pending.set(requestId, { resolve, reject, timer })
      send(OP.Request, { requestType, requestId, requestData })
    })

  const refreshScenes = async (): Promise<void> => {
    const data = await request("GetSceneList")
    const scenes = (Array.isArray(data.scenes) ? data.scenes : [])
      .filter(isRecord)
      // OBS numera desde abajo (sceneIndex 0 = última de la lista visible).
      .sort((a, b) => Number(b.sceneIndex) - Number(a.sceneIndex))
      .map((s) => s.sceneName)
      .filter((name): name is string => typeof name === "string")
    const current = typeof data.currentProgramSceneName === "string" ? data.currentProgramSceneName : null
    update({ scenes, current })
  }

  const rejectPending = (reason: string): void => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(new Error(reason))
    }
    pending.clear()
  }

  const handleMessage = (socket: WebSocket, raw: WebSocket.RawData): void => {
    let msg: unknown
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (!isRecord(msg) || !isRecord(msg.d)) return
    const d = msg.d

    switch (msg.op) {
      case OP.Hello: {
        const auth = isRecord(d.authentication) ? d.authentication : undefined
        let authentication: string | undefined
        if (auth) {
          if (!password) {
            update({ status: "unauthorized", error: "OBS pide contraseña: defínela en OBS_WS_PASSWORD (.env.local)" })
            socket.close()
            return
          }
          const secret = sha256Base64(password + String(auth.salt))
          authentication = sha256Base64(secret + String(auth.challenge))
        }
        send(OP.Identify, { rpcVersion: 1, authentication, eventSubscriptions: EVENTS_SCENES })
        break
      }
      case OP.Identified:
        update({ status: "connected", error: undefined })
        refreshScenes().catch((err: Error) => update({ error: err.message }))
        break
      case OP.Event: {
        const data = isRecord(d.eventData) ? d.eventData : {}
        if (d.eventType === "CurrentProgramSceneChanged" && typeof data.sceneName === "string") {
          update({ current: data.sceneName })
        } else if (d.eventType === "SceneListChanged" || d.eventType === "SceneNameChanged") {
          refreshScenes().catch(() => undefined)
        }
        break
      }
      case OP.RequestResponse: {
        const requestId = String(d.requestId)
        const entry = pending.get(requestId)
        if (!entry) break
        pending.delete(requestId)
        clearTimeout(entry.timer)
        const status = isRecord(d.requestStatus) ? d.requestStatus : {}
        if (status.result === true) entry.resolve(isRecord(d.responseData) ? d.responseData : {})
        else entry.reject(new Error(typeof status.comment === "string" ? status.comment : `OBS respondió con código ${String(status.code)}`))
        break
      }
    }
  }

  const connect = (): void => {
    if (closed) return
    lastError = undefined
    update({ status: "connecting", error: undefined })

    const socket = new WebSocket(url)
    ws = socket

    socket.on("message", (raw) => handleMessage(socket, raw))

    socket.on("error", (err: NodeJS.ErrnoException) => {
      lastError = err.code === "ECONNREFUSED" ? "OBS cerrado o obs-websocket desactivado" : err.message
    })

    socket.on("close", (code) => {
      rejectPending("Se cerró la conexión con OBS")
      if (ws === socket) ws = undefined
      if (closed) return

      if (code === CLOSE_AUTH_FAILED) {
        update({ status: "unauthorized", error: "Contraseña de obs-websocket incorrecta (OBS_WS_PASSWORD)" })
      }
      // Con contraseña faltante o incorrecta no tiene caso reintentar: se lee al arrancar el CG.
      if (state.status === "unauthorized") return

      update({ status: "error", error: lastError ?? "OBS cerró la conexión" })
      reconnectTimer = setTimeout(connect, RECONNECT_MS)
    })
  }

  connect()

  return {
    getState: () => state,
    setScene: async (sceneName) => {
      await request("SetCurrentProgramScene", { sceneName })
    },
    close: () => {
      closed = true
      clearTimeout(reconnectTimer)
      rejectPending("Cliente de OBS detenido")
      ws?.close()
    },
  }
}
