/*
 * Fuentes empaquetadas localmente (@fontsource): el CG funciona sin internet
 * en la cabina y no depende de Google Fonts en vivo.
 */
import "@fontsource/cinzel/500.css"
import "@fontsource/cinzel/700.css"
import "@fontsource/montserrat/300.css"
import "@fontsource/montserrat/500.css"
import "@fontsource/montserrat/600.css"
import "@fontsource/montserrat/800.css"
import "@fontsource/montserrat/800-italic.css"
import "@fontsource/noto-serif-display/400.css"
import "@fontsource/noto-serif-display/400-italic.css"
import "@fontsource/noto-serif-display/600.css"
import "@fontsource/eb-garamond/400.css"
import "@fontsource/eb-garamond/500.css"
import "@fontsource/eb-garamond/600.css"
import "@fontsource/eb-garamond/400-italic.css"

/**
 * El navegador solo descarga una @font-face cuando algo la usa. Sin precarga,
 * la PRIMERA entrada al aire de cada tema se vería con la fuente de respaldo
 * y cambiaría a media animación (FOUT). Forzamos la carga al iniciar.
 */
const FACES = [
  "500 1em Cinzel",
  "700 1em Cinzel",
  "300 1em Montserrat",
  "500 1em Montserrat",
  "600 1em Montserrat",
  "800 1em Montserrat",
  "italic 800 1em Montserrat",
  "400 1em 'Noto Serif Display'",
  "italic 400 1em 'Noto Serif Display'",
  "600 1em 'Noto Serif Display'",
  "400 1em 'EB Garamond'",
  "500 1em 'EB Garamond'",
  "600 1em 'EB Garamond'",
  "italic 400 1em 'EB Garamond'",
]

export function preloadFonts(): Promise<void> {
  if (!("fonts" in document)) return Promise.resolve()
  return Promise.allSettled(FACES.map((face) => document.fonts.load(face))).then(() => undefined)
}
