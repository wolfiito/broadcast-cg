import type { FreeShowShow } from "./protocol"

/**
 * Convierte el texto plano de una diapositiva de FreeShow en contenido para la pleca.
 *
 * Tipos de contenido:
 *  - scripture → versículo. Subtítulo = cita ("Juan 3:16").
 *  - lyrics    → letra de canción. Subtítulo = créditos de la canción (según `songCredits`).
 *  - info      → anuncios / otros shows. Subtítulo = nombre del show.
 */

export type ContentKind = "scripture" | "lyrics" | "info"

/** always = en cada diapositiva · first = solo en la primera · never = nunca */
export type SongCreditsMode = "always" | "first" | "never"

const REFERENCE_RE =
  /^(?:[1-4](?:a|ra|da|ta|\s+de)?\s*)?\p{L}[\p{L}.]*(?:\s+\p{L}[\p{L}.]*){0,3}\s+\d{1,3}(?:[:.]\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?(?:\s*\(?[A-Z0-9]{2,10}\)?)?$/ui

export function isScriptureReference(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.length <= 48 && REFERENCE_RE.test(trimmed)
}

export interface ParsedSlide {
  title: string
  subtitle: string | undefined
  kind: ContentKind
}

export interface ParseContext {
  show?: FreeShowShow | undefined
  groupName?: string | undefined
  /** Índice de la diapositiva dentro del layout (0 = primera). */
  slideIndex?: number | undefined
  songCredits?: SongCreditsMode
}

/** "Sublime Gracia · John Newton · CCLI 22025" */
export function songCreditLine(show: FreeShowShow): string | undefined {
  const title = show.meta.title ?? show.name
  const by = show.meta.author ?? show.meta.artist
  const ccli = show.meta.CCLI ? `CCLI ${show.meta.CCLI}` : undefined
  const parts = [title, by, ccli].filter(Boolean)
  return parts.length ? parts.join("  ·  ") : undefined
}

function splitReference(lines: string[]): { body: string[]; reference: string } | null {
  if (lines.length < 2) return null
  const last = lines[lines.length - 1] ?? ""
  if (isScriptureReference(last)) return { body: lines.slice(0, -1), reference: last }
  const first = lines[0] ?? ""
  if (isScriptureReference(first)) return { body: lines.slice(1), reference: first }
  return null
}

export function parseSlideText(raw: string, ctx: ParseContext = {}): ParsedSlide | null {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return null

  const { show, groupName, slideIndex, songCredits = "first" } = ctx
  const ref = splitReference(lines)
  const nameToTest = `${show?.name ?? ""} ${groupName ?? ""}`

  const scriptureKeywords = /biblia|escritura|vers[ií]culo|mensaje|pr[eé]dica|serm[oó]n|lectura/i
  const isProbablyScripture = scriptureKeywords.test(nameToTest)



  // 1. Biblia: por metadato de FreeShow, porque la cita aparece al final, o por nombre heurístico.
  if (ref || show?.isScripture || isProbablyScripture) {
    let titleLines = ref?.body ?? lines
    let subtitleVers = ref?.reference ?? show?.name
    
    // Si la cita no se separó con splitReference pero la última línea es explícitamente la cita:
    if (!ref && lines.length >= 2) {
      const lastLine = lines[lines.length - 1] ?? ""
      if (lastLine === show?.name || isScriptureReference(lastLine)) {
        subtitleVers = lines.pop()
        titleLines = lines
      }
    }

    return {
      title: titleLines.join("\n"),
      subtitle: subtitleVers,
      kind: "scripture",
    }
  }

  const title = lines.join("\n")

  // 2. Canción: si la presentación completa fue clasificada como canción (isSong),
  // o su categoría/metadatos/grupos lo indican, o el nombre/grupo actual lo sugiere.
  const cat = show?.category?.toLowerCase() || ""
  const isSongCat = cat === "song" || /canci[oó]n|alabanza|adoraci[oó]n|himno|m[uú]sica/i.test(cat)
  const hasSongMeta = Boolean(show?.meta.author || show?.meta.artist || show?.meta.CCLI)
  const isSong = Boolean(show?.isSong || isSongCat || hasSongMeta)
  
  const songKeywords = /canci[oó]n|alabanza|adoraci[oó]n|himno|m[uú]sica|coro|verso|verse|chorus|bridge|puente|estrofa|intro|outro|pre[- ]?coro|tag/i
  const isProbablySong = isSong || songKeywords.test(nameToTest) || (!show?.category && lines.length >= 3)

  if (isProbablySong) {
    const showCredits = songCredits === "always" || (songCredits === "first" && (slideIndex ?? 0) === 0)
    return { title, subtitle: showCredits && show ? songCreditLine(show) : undefined, kind: "lyrics" }
  }

  // 3. Cualquier otro show (nombres, anuncios…).
  //    Diapositiva de 2 líneas = "Nombre / Cargo" (o "Evento / Fecha"): la 2ª línea es el subtítulo.
  const [first, second] = lines
  if (lines.length === 2 && first && second) return { title: first, subtitle: second, kind: "info" }
  return { title, subtitle: show && show.name !== title ? show.name : undefined, kind: "info" }
}
