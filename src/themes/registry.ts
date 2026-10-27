import type { ThemeDefinition, ThemeId } from "./types"
import { otonoTheme } from "./presets/otono"
import { pizarraTheme } from "./presets/pizarra"
import { navidadBiselTheme, navidadCarmesiTheme } from "./presets/navidad"

/**
 * Registro central de temas. Para agregar uno nuevo:
 *  1. Agrega el id en THEME_IDS (themes/types.ts).
 *  2. Crea presets/<id>.module.css con las clases del contrato ThemeClasses.
 *  3. Define sus variantes (puedes reutilizar maskLine de motion.ts).
 *  4. Regístralo aquí. TypeScript marcará error si falta alguno.
 */
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  otono: otonoTheme,
  pizarra: pizarraTheme,
  navidad_bisel: navidadBiselTheme,
  navidad_carmesi: navidadCarmesiTheme,
}
