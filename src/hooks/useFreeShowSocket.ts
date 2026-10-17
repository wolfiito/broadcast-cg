import { useCallback, useEffect, useState } from "react"
import { io } from "socket.io-client"
import {
  FREESHOW_EVENT,
  asOutput,
  asShow,
  encodeRequest,
  parseIncoming,
  type FreeShowGetAction,
  type FreeShowShow,
} from "@/lib/freeshow/protocol"
import { parseSlideText } from "@/lib/freeshow/parseSlide"
import { useGraphicsStore, type ConnectionStatus } from "@/store/useGraphicsStore"

export interface FreeShowSocketOptions {
  host: string
  port: number
  /** Contraseña de la API de FreeShow. Viene de .env.local o URL, nunca hardcodeada. */
  token: string | undefined
  pollMs: number
  debounceMs: number
  enabled: boolean
}

export interface FreeShowSocketHandle {
  status: ConnectionStatus
  reconnect: () => void
}

/** Una petición sin respuesta en este tiempo se considera perdida y se reintenta. */
const IN_FLIGHT_TIMEOUT_MS = 3000
/** Tiempo máximo esperando los datos del show antes de publicar sin ellos. */
const SHOW_WAIT_MS = 500
/** Frecuencia máxima con la que reportamos "último mensaje" al store (evita re-renders a 3 Hz). */
const HEARTBEAT_THROTTLE_MS = 2000

/**
 * Conecta con la API de FreeShow y traduce la salida en vivo a eventos del store.
 *
 * FreeShow no emite cambios: sondeamos `get_output_slide_text` (texto al aire) y
 * `get_output` (show + índice de diapositiva). Solo publicamos cuando el contenido
 * CAMBIA, con dos amortiguadores:
 *  - debounce: pasar diapositivas rápido no encima animaciones.
 *  - clearHold: si FreeShow limpia un instante entre versículos, la pleca no sale.
 */
export function useFreeShowSocket(options: FreeShowSocketOptions): FreeShowSocketHandle {
  const { host, port, token, pollMs, debounceMs, enabled } = options
  const status = useGraphicsStore((s) => s.connection.status)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const { setConnection, ingestRemote } = useGraphicsStore.getState()

    if (!enabled) {
      setConnection({ status: "disabled", error: undefined })
      return
    }

    const url = `http://${host}:${port}`
    setConnection({ status: "connecting", url, error: undefined })

    const socket = io(url, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 4000,
      forceNew: true,
      ...(token ? { auth: { token } } : {}),
    })

    /* ── Estado de la sesión (vive en el closure, no en React: no provoca renders) ── */
    let showId: string | undefined
    let show: FreeShowShow | undefined
    let groupName: string | undefined
    let showRequestedAt = 0
    let slideIndex: number | undefined
    let slideText: string | undefined
    let activeTempText: string | undefined
    let lastSignature: string | null | undefined // undefined = aún no publicamos nada
    let lastHeartbeat = 0
    let pollTimer: number | undefined
    let commitTimer: number | undefined
    let clearTimer: number | undefined
    const inFlight = new Map<FreeShowGetAction, number>()

    const request = (action: FreeShowGetAction, payload?: Record<string, unknown>): void => {
      const since = inFlight.get(action)
      if (since !== undefined && Date.now() - since < IN_FLIGHT_TIMEOUT_MS) return
      inFlight.set(action, Date.now())
      socket.emit(FREESHOW_EVENT, encodeRequest(action, payload))
    }

    const publish = (signature: string | null, payload: Parameters<typeof ingestRemote>[0]): void => {
      window.clearTimeout(clearTimer)
      clearTimer = undefined
      if (signature === lastSignature) return
      lastSignature = signature
      ingestRemote(payload)
    }

    const commit = (): void => {
      if (slideText === undefined) return

      // Si acaba de cambiar el show, esperamos sus datos (nombre, categoría, CCLI) para no animar dos veces.
      if (!show && showId !== undefined && Date.now() - showRequestedAt < SHOW_WAIT_MS) {
        scheduleCommit()
        return
      }

      const parsed = parseSlideText(slideText, {
        show,
        groupName,
        slideIndex,
        songCredits: useGraphicsStore.getState().songCredits,
      })

      if (parsed) {
        publish(`${parsed.kind}\u0000${parsed.title}\u0000${parsed.subtitle ?? ""}`, parsed)
        return
      }

      // Salida vacía: no bajamos la pleca de inmediato. Si llega texto nuevo
      // durante `clearHoldMs`, solo se actualiza el texto (versículo a versículo).
      if (lastSignature === null || clearTimer !== undefined) return
      const holdMs = useGraphicsStore.getState().clearHoldMs
      if (holdMs <= 0) {
        publish(null, null)
        return
      }
      clearTimer = window.setTimeout(() => {
        clearTimer = undefined
        if (!slideText) publish(null, null)
      }, holdMs)
    }

    const scheduleCommit = (): void => {
      window.clearTimeout(commitTimer)
      commitTimer = window.setTimeout(commit, debounceMs)
    }

    const poll = (): void => {
      request("get_output_slide_text")
      request("get_output")
    }

    const startPolling = (): void => {
      window.clearInterval(pollTimer)
      poll()
      pollTimer = window.setInterval(poll, pollMs)
    }

    const stopPolling = (): void => {
      window.clearInterval(pollTimer)
      pollTimer = undefined
      inFlight.clear()
    }

    // Si el operador cambia el modo de créditos de canciones, re-evaluamos lo que está al aire.
    const unsubscribe = useGraphicsStore.subscribe((state, prev) => {
      if (state.songCredits !== prev.songCredits) scheduleCommit()
    })

    /* ── Ciclo de vida de la conexión ── */
    socket.on("connect", () => {
      setConnection({ status: "connected", error: undefined, lastMessageAt: Date.now() })
      startPolling()
    })

    socket.on("disconnect", (reason) => {
      stopPolling()
      setConnection({ status: "disconnected", error: reason })
    })

    socket.on("connect_error", (err) => {
      setConnection({ status: "error", error: err.message })
    })

    /* ── Mensajes de FreeShow ── */
    socket.on(FREESHOW_EVENT, (raw: unknown) => {
      const msg = parseIncoming(raw)
      if (!msg) return

      if (msg.kind === "error") {
        if (msg.status === 401) {
          stopPolling()
          setConnection({ status: "unauthorized", error: "Contraseña de API incorrecta o faltante" })
        }
        return
      }

      inFlight.delete(msg.action as FreeShowGetAction)

      const now = Date.now()
      if (now - lastHeartbeat > HEARTBEAT_THROTTLE_MS) {
        lastHeartbeat = now
        setConnection({ lastMessageAt: now })
      }

      switch (msg.action) {
        case "get_output_slide_text": {
          const text = typeof msg.data === "string" ? msg.data : ""
          
          // Si tenemos un texto extraído localmente (tempText) y FreeShow nos manda vacío (típico en Escrituras),
          // ignoramos la cadena vacía para no sobrescribir el texto real y que parpadee.
          if (activeTempText && !text) break

          if (text !== slideText) {
            slideText = text
            activeTempText = undefined
            scheduleCommit()
          }
          break
        }
        case "get_output": {
          const slide = asOutput(msg.data).slide
          const nextShowId = slide?.id
          
          if (slide?.index !== slideIndex) {
            slideIndex = slide?.index
            if (nextShowId && nextShowId !== "temp") {
              request("get_output_group_name")
            }
            scheduleCommit()
          }

          // Diapositivas temporales (Escrituras lanzadas desde FreeShow o el control remoto)
          if (slide?.tempIsScripture || nextShowId === "temp") {
            const scriptureRef = slide?.tempReference
            showId = "temp"
            show = { isScripture: true, ...(scriptureRef ? { name: scriptureRef } : {}), meta: {} }
            groupName = "Escritura"
            if (slide?.tempText) {
              slideText = slide.tempText
              activeTempText = slide.tempText
            }
            scheduleCommit()
            break
          }

          if (nextShowId && nextShowId !== showId) {
            showId = nextShowId
            show = undefined
            groupName = undefined
            showRequestedAt = Date.now()
            request("get_show", { id: nextShowId })
            request("get_output_group_name")
          } else if (!nextShowId) {
            showId = undefined
            show = undefined
            groupName = undefined
          }
          break
        }
        case "get_show": {
          if (msg.requestId !== showId) break // respuesta de un show que ya no está al aire
          show = asShow(msg.data)
          scheduleCommit()
          break
        }
        case "get_output_group_name": {
          if (typeof msg.data === "string") {
            groupName = msg.data
            scheduleCommit()
          }
          break
        }
      }
    })

    return () => {
      unsubscribe()
      stopPolling()
      window.clearTimeout(commitTimer)
      window.clearTimeout(clearTimer)
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [host, port, token, pollMs, debounceMs, enabled, attempt])

  const reconnect = useCallback(() => setAttempt((n) => n + 1), [])

  return { status, reconnect }
}
