/**
 * Identidad de la iglesia.
 *
 * LOGO: coloca el archivo en `public/brand/logo.png` (PNG con fondo transparente o SVG).
 * Se puede cambiar por URL: `?logo=brand/logo-blanco.svg`.
 * Recomendado: versión monocromática blanca, mínimo 400 px de alto.
 */
const params = new URLSearchParams(window.location.search)

export const BRAND_LOGO_URL = params.get("logo") ?? "brand/logo.png"

/* ── Derivados del color de acento (sin color-mix(): OBS 30 usa Chromium 103) ── */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m?.[1]) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1]
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Variables CSS que los temas usan: --accent, --accent-a10/45/70, --accent-light. */
export function accentVariables(hex: string): Record<string, string> {
  const rgb = parseHex(hex) ?? [201, 169, 110]
  const [r, g, b] = rgb
  const mix = (c: number) => Math.round(c + (255 - c) * 0.5)
  return {
    "--accent": `rgb(${r} ${g} ${b})`,
    "--accent-a10": `rgb(${r} ${g} ${b} / 0.1)`,
    "--accent-a45": `rgb(${r} ${g} ${b} / 0.45)`,
    "--accent-a70": `rgb(${r} ${g} ${b} / 0.7)`,
    "--accent-light": `rgb(${mix(r)} ${mix(g)} ${mix(b)})`,
  }
}

/** Paleta sugerida: tonos sobrios que funcionan sobre video (sin saturación de noticiero). */
export const ACCENT_PRESETS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: "Champaña", hex: "#c9a96e" },
  { name: "Oro viejo", hex: "#b8955a" },
  { name: "Marfil", hex: "#e8e0d0" },
  { name: "Salvia", hex: "#9fb3a0" },
  { name: "Azul sereno", hex: "#8fa9c4" },
  { name: "Vino", hex: "#a8676f" },
]
