import { isThemeId, type ThemeId } from "@/themes/types"

export type FollowMode = "auto" | "manual"

/**
 * Configuración resuelta al arrancar.
 * Prioridad: parámetros de URL  >  variables VITE_*  >  valores por defecto.
 *
 * Ejemplo de URL para OBS:
 *   http://localhost:5173/?theme=cinematic&host=192.168.1.20&port=5505
 */
export interface RuntimeConfig {
  host: string
  /** Puerto WebSocket (Socket.IO) de la API de FreeShow. Por defecto 5505. */
  port: number
  /** Contraseña de la API de FreeShow, si está habilitada. Nunca se hardcodea. */
  token: string | undefined
  /** Intervalo de sondeo a FreeShow (la API no emite eventos push). */
  pollMs: number
  /** Retardo mínimo antes de mostrar un cambio, evita "parpadeos" al pasar slides rápido. */
  debounceMs: number
  theme: ThemeId | undefined
  follow: FollowMode | undefined
  /** Muestra el panel de control. Por defecto: oculto dentro de OBS, visible en navegador. */
  panel: boolean
  isObs: boolean
  /** Desactiva la conexión a FreeShow (útil para diseñar sin FreeShow abierto). */
  offline: boolean
}

function readNumber(value: string | null | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function readBool(value: string | null): boolean | undefined {
  if (value === null) return undefined
  return value === "" || value === "1" || value === "true"
}

export function resolveRuntimeConfig(search: string = window.location.search): RuntimeConfig {
  const params = new URLSearchParams(search)
  const env = import.meta.env
  const isObs = typeof window.obsstudio !== "undefined"

  const themeParam = params.get("theme")
  const followParam = params.get("follow")

  return {
    host: params.get("host") ?? env.VITE_FREESHOW_HOST ?? "localhost",
    port: readNumber(params.get("port") ?? env.VITE_FREESHOW_PORT, 5505),
    // Se acepta ?token= por conveniencia en red local, pero preferir .env.local:
    // la URL de una Browser Source queda guardada en texto plano en la colección de escenas de OBS.
    token: params.get("token") ?? (env.VITE_FREESHOW_TOKEN || undefined),
    pollMs: readNumber(params.get("poll"), 300),
    debounceMs: readNumber(params.get("debounce"), 90),
    theme: themeParam && isThemeId(themeParam) ? themeParam : undefined,
    follow: followParam === "auto" || followParam === "manual" ? followParam : undefined,
    panel: readBool(params.get("panel")) ?? !isObs,
    isObs,
    offline: readBool(params.get("offline")) ?? false,
  }
}

export const runtimeConfig = resolveRuntimeConfig()
