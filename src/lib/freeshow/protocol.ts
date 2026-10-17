/**
 * Protocolo de la API de FreeShow (verificado contra el código fuente de FreeShow:
 * src/electron/utils/api.ts y src/frontend/components/actions/api.ts).
 *
 * - Transporte: Socket.IO en el puerto 5505 (Settings > Connections > API).
 *   OJO: 4455 es el puerto de obs-websocket, no de FreeShow.
 * - Petición:  socket.emit("data", JSON.stringify({ action, ...payload }))
 * - Respuesta: solo las acciones "get_*" responden, por el mismo evento "data":
 *              { action, ...payload, data: <resultado> }
 * - No hay suscripción/push de cambios: hay que sondear (polling).
 * - Contraseña incorrecta: { status: 401, error: "Unauthorized" }.
 */

export const FREESHOW_EVENT = "data" as const

export type FreeShowGetAction =
  | "get_output"
  | "get_output_slide_text"
  | "get_output_group_name"
  | "get_show"
  | "get_cleared"

/** Subconjunto de `outputs[id].out.slide` que usamos para detectar cambios de diapositiva. */
export interface FreeShowOutputSlide {
  id?: string
  layout?: string
  index?: number
  /** Texto concatenado si la diapositiva envía el texto crudo en `tempItems` (ej. Biblias). */
  tempText?: string
  /** Determinado al existir variables del plugin Biblia en FreeShow o id 'temp'. */
  tempIsScripture?: boolean
  /** Cita bíblica (ej. "Juan 3:16") extraída de customDynamicValues. */
  tempReference?: string
}

export interface FreeShowOutput {
  slide: FreeShowOutputSlide | null
}

/** Subconjunto del tipo `Show` de FreeShow (src/types/Show.ts) que nos interesa. */
export interface FreeShowShow {
  name?: string
  /** "song", "info", etc. o null. */
  category?: string
  /** true si el show fue generado desde el cajón de Biblia de FreeShow. */
  isScripture: boolean
  /** true si el show es una alabanza/canción (por categoría, CCLI/autor, o grupos Coro/Verso). */
  isSong?: boolean
  meta: {
    title?: string
    artist?: string
    author?: string
    CCLI?: string
    copyright?: string
  }
}

export interface FreeShowResponse {
  kind: "response"
  action: string
  data: unknown
  /** FreeShow devuelve el payload original junto a la respuesta; `id` permite correlacionar get_show. */
  requestId: string | undefined
}

export interface FreeShowError {
  kind: "error"
  status: number
  message: string
}

export type FreeShowIncoming = FreeShowResponse | FreeShowError

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Normaliza lo que llegue por el socket (string JSON u objeto). Nunca lanza. */
export function parseIncoming(raw: unknown): FreeShowIncoming | null {
  let value: unknown = raw
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!isRecord(value)) return null

  const status = value["status"]
  if (typeof status === "number" && status >= 400) {
    return { kind: "error", status, message: String(value["error"] ?? "Error") }
  }
  const action = value["action"]
  if (typeof action === "string") {
    const id = value["id"]
    return { kind: "response", action, data: value["data"], requestId: typeof id === "string" ? id : undefined }
  }
  return null
}

export function encodeRequest(action: FreeShowGetAction, payload: Record<string, unknown> = {}): string {
  return JSON.stringify({ action, ...payload })
}

function stripHtml(input: string): string {
  if (!input) return ""
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

export function asOutput(data: unknown): FreeShowOutput {
  if (!isRecord(data)) return { slide: null }
  const slide = data["slide"]
  if (!isRecord(slide)) return { slide: null }

  const out: FreeShowOutputSlide = {}
  if (typeof slide["id"] === "string") out.id = slide["id"]
  if (typeof slide["layout"] === "string") out.layout = slide["layout"]
  if (typeof slide["index"] === "number") out.index = slide["index"]
  
  // Extraer texto de biblias u otros elementos que vienen vía tempItems y no vía get_output_slide_text
  const tempItems = slide["tempItems"]
  const dynamicValues = slide["customDynamicValues"]
  let combined = ""
  
  if (isRecord(dynamicValues) && typeof dynamicValues["scripture_text"] === "string") {
    combined = stripHtml(dynamicValues["scripture_text"])
  } else if (isRecord(dynamicValues) && Array.isArray(dynamicValues["scripture_text"])) {
    combined = dynamicValues["scripture_text"]
      .map((entry) => {
        if (Array.isArray(entry)) {
          const [num, txt] = entry
          const prefix = num && num !== "0" ? `${num} ` : ""
          return `${prefix}${stripHtml(String(txt ?? ""))}`
        }
        return stripHtml(String(entry ?? ""))
      })
      .filter(Boolean)
      .join("\n")
  } else if (isRecord(dynamicValues) && typeof dynamicValues["text"] === "string") {
    combined = stripHtml(dynamicValues["text"])
  } else if (Array.isArray(tempItems)) {
    combined = tempItems
      .filter(isRecord)
      .map((item) => {
        if (typeof item["text"] === "string") return stripHtml(item["text"])
        if (Array.isArray(item["lines"])) {
          return item["lines"]
            .filter(isRecord)
            .map((line) => {
              const texts = Array.isArray(line["text"]) ? line["text"] : []
              return texts
                .filter(isRecord)
                .map((run) => (typeof run["value"] === "string" ? stripHtml(run["value"]) : ""))
                .join("")
            })
            .join("\n")
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
      
  // Detección de Escrituras temporales (doble clic en pestaña de Biblias o 'Lanzar' desde el control)
  const isTemp = slide["id"] === "temp"
  let scriptureRef: string | undefined
  
  if (isRecord(dynamicValues)) {
    const refVal = dynamicValues["scripture_reference_full"] ?? dynamicValues["scripture_reference"] ?? dynamicValues["title"]
    if (typeof refVal === "string" && refVal.trim()) {
      scriptureRef = refVal.trim()
    } else if (typeof dynamicValues["scripture_name"] === "string" && dynamicValues["scripture_name"].trim()) {
      scriptureRef = dynamicValues["scripture_name"].trim()
    }
  }

  if (isTemp || scriptureRef) {
    out.tempIsScripture = true
    if (scriptureRef) out.tempReference = scriptureRef
  }
  if (combined) {
    out.tempText = combined
  }
  
  return { slide: out }
}

export function asShow(data: unknown): FreeShowShow {
  const show: FreeShowShow = { isScripture: false, isSong: false, meta: {} }
  if (!isRecord(data)) return show

  const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined)
  const name = str(data["name"])
  const category = str(data["category"])
  if (name) show.name = name
  if (category) show.category = category

  const reference = data["reference"]
  show.isScripture = isRecord(reference) && reference["type"] === "scripture"

  const meta = data["meta"]
  if (isRecord(meta)) {
    for (const key of ["title", "artist", "author", "CCLI", "copyright"] as const) {
      const value = str(meta[key])
      if (value) show.meta[key] = value
    }
  }

  // Identificación de canción a nivel de toda la presentación:
  // 1. Por categoría ("song", "alabanza", etc.) o metadatos de CCLI/autor
  const cat = category?.toLowerCase() || ""
  const isSongCat = cat === "song" || /canci[oó]n|alabanza|adoraci[oó]n|himno|m[uú]sica/i.test(cat)
  const hasSongMeta = Boolean(show.meta.author || show.meta.artist || show.meta.CCLI)

  // 2. Por etiquetas de grupo en sus diapositivas ([Coro], [Verso], [Pre-Coro], etc.):
  const slides = data["slides"]
  const songGroupKeywords = /coro|verso|verse|chorus|bridge|puente|estrofa|intro|outro|pre[- ]?coro|tag/i
  let hasSongGroups = false
  if (isRecord(slides)) {
    hasSongGroups = Object.values(slides).some((slide) => {
      if (isRecord(slide) && typeof slide["group"] === "string") {
        return songGroupKeywords.test(slide["group"])
      }
      return false
    })
  }

  // 3. Por nombre de la presentación (si contiene términos de canción):
  const hasSongName = /canci[oó]n|alabanza|adoraci[oó]n|himno/i.test(name ?? "")

  show.isSong = !show.isScripture && (isSongCat || hasSongMeta || hasSongGroups || hasSongName)

  return show
}

/** Clave estable de la diapositiva al aire. `null` = no hay diapositiva (salida limpia). */
export function slideKey(output: FreeShowOutput): string | null {
  const s = output.slide
  if (!s?.id) return null
  return `${s.id}|${s.layout ?? ""}|${s.index ?? -1}`
}
