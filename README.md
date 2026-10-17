# Broadcast CG — Motor de plecas para OBS + FreeShow

Generador de caracteres (CG) en React + TypeScript que lee la salida en vivo de **FreeShow**
y muestra lower thirds (plecas) animadas con Framer Motion, sobre fondo transparente para
una **Browser Source de OBS**.

> 📋 **Operadores:** ver [GUIA-OPERACION.md](GUIA-OPERACION.md) para el paso a paso con FreeShow y OBS.

## Inicio rápido

```bash
npm install
npm run mock        # (opcional) simulador de FreeShow en :5505, sin necesidad de FreeShow
npm run dev         # http://localhost:5173  → abre con panel de control
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck estricto + build a `dist/` |
| `npm run mock -- 5505 3000` | Simula FreeShow (puerto, ms entre diapositivas) |

## Conectar FreeShow

1. FreeShow → **Settings → Connections → API**: activar **WebSocket/REST**.
2. Puerto por defecto: **5505** (Socket.IO). ⚠️ **4455 es el puerto de obs-websocket**, no de FreeShow.
3. Si configuraste contraseña, cópiala a `.env.local` (ver `.env.example`). **No se versiona.**

FreeShow **no emite eventos**: el CG sondea `get_output_slide_text` y `get_output` (300 ms por
defecto) y solo anima cuando el contenido **cambia**. El protocolo está documentado en
`src/lib/freeshow/protocol.ts` (verificado contra el código fuente de FreeShow).

## Configurar OBS

1. **Fuente → Navegador** con la URL que copia el panel (botón *Copiar URL*), p. ej.
   `http://localhost:5173/?theme=cinematic&host=localhost&port=5505`
2. Ancho **1920**, alto **1080**, *Usar velocidad de fotogramas personalizada*: **60**.
3. **Desactivar** "Apagar la fuente cuando no sea visible" (si no, se reconecta y pierde la primera entrada).
4. OBS → Ajustes → Avanzado → **Aceleración por hardware de fuentes de navegador**: activado.

Dentro de OBS el panel se oculta solo (detecta `window.obsstudio`) y el fondo es transparente.
Para producción: `npm run build` y servir `dist/` (o `npm run preview`).

### Parámetros de URL

| Parámetro | Ejemplo | Descripción |
| --- | --- | --- |
| `theme` | `sereno` · `lucas` · `cinematic` · `worship` · `docu` · `glass` | Tema de la fuente |
| `iglesia` / `serie` | `Lampei` / `Lucas · Octubre` | Firma y leyenda de la serie (temas que la usan) |
| `screen` | `inicio` · `fin` | Pantalla completa (escena propia), con `hora=11:00` o `minutos=10` |
| `logo` | `brand/logo-blanco.svg` | Ruta del logo (por defecto `brand/logo.png`) |
| `host` / `port` | `192.168.1.20` / `5505` | Dónde corre FreeShow |
| `follow` | `auto` · `manual` | Auto = FreeShow sale al aire; manual = va a PREVIEW |
| `panel` | `1` · `0` | Forzar panel visible/oculto |
| `poll` / `debounce` | `300` / `90` | Ms de sondeo / estabilización |
| `offline` | `1` | No conectar a FreeShow (diseño puro) |

## Logo e identidad de la iglesia

1. Copia el logo a **`public/brand/logo.png`** (PNG transparente o SVG; ideal ≥ 400 px de alto).
   Hay un `logo-ejemplo.svg` para probar: `?logo=brand/logo-ejemplo.svg`.
2. En el panel → *Identidad de la iglesia*:
   - **Logo dentro de la pleca** (temas Sereno, Cinematic, Glass; se oculta en canciones).
   - **Marca de agua** en la esquina superior derecha.
   - **Logo en blanco**: convierte un logo a color en silueta blanca (más elegante sobre video).
   - **Color de acento**: filetes, citas y números de versículo usan el color de la iglesia.

## Cómo se comporta con cada tipo de contenido

| Tipo | Se detecta por | Diseño |
| --- | --- | --- |
| **Versículo** | `reference.type = "scripture"` en FreeShow o cita en el texto ("Juan 3:16") | Ancho fijo, serif, número de versículo en superíndice, cita como subtítulo |
| **Canción** | Categoría `song` o metadatos de autor/CCLI | Centrado, máx. 2 renglones grandes, créditos (título · autor · CCLI) en la 1ª diapositiva |
| **Info** | Cualquier otro show | Nombre del show como subtítulo |

- **Versículo a versículo / estrofa a estrofa**: la pleca **no sale**. El texto hace un fundido
  cruzado y la caja ajusta su alto suavemente. Si FreeShow limpia la salida un instante entre
  diapositivas, se ignora (ajustable en *Comportamiento*, 0.7 s por defecto).
- **Texto demasiado largo**: cada tema define un alto máximo (`--fit-max-height`) y un tamaño
  mínimo (`--fit-min`); el título se reduce automáticamente hasta caber.

## Arquitectura

```
src/
├── config/runtime.ts            URL params > VITE_* > defaults
├── lib/
│   ├── freeshow/protocol.ts     Tipos + parseo seguro del protocolo FreeShow
│   ├── freeshow/parseSlide.ts   Texto → { title, subtitle } (detecta "Juan 3:16")
│   └── fonts.ts                 Fuentes locales (@fontsource) + precarga anti-FOUT
├── hooks/
│   ├── useFreeShowSocket.ts     Socket.IO, sondeo, dedupe, debounce, reconexión, 401
│   ├── useAutoHide.ts           Ocultar tras N s
│   └── useKeyboardShortcuts.ts  Atajos de operador
├── store/useGraphicsStore.ts    Zustand: PREVIEW / PROGRAM / onAir, ajustes persistidos
├── themes/
│   ├── types.ts                 Contrato ThemeClasses + ThemeMotion
│   ├── motion.ts                Curvas bezier, resortes, maskLine, textBlock (entrada vs. fundido)
│   ├── registry.ts              Registro de temas
│   ├── ThemeProvider.tsx        Inyecta clases + variantes del tema activo
│   └── presets/                 *.module.css + variantes por tema
└── components/
    ├── LowerThird/              Pleca (AnimatePresence + máscaras de revelado)
    ├── ControlPanel/            Panel del operador (no aparece en OBS)
    ├── overlays/                LogoBug, LiveBug (EN VIVO + reloj), guías de áreas seguras
    └── stage/BroadcastCanvas    Lienzo 1920×1080 escalado
```

### Capas de animación del LowerThird

```
stage (posición, data-kind = scripture | lyrics | info)
└─ box      ← variants.box     (clip-path / blur / escala)       entra 1º, sale último
   └─ panel (fondo CSS del tema) · logo
      ├─ accent ← variants.accent (filete en el color de la iglesia)
      └─ content (AutoHeight) ← title / subtitle: textBlock · key = texto
         ├─ mask › line  ← variants.line        (revelado vertical)
         └─ mask › line  ← variants.subtitleLine
```

- **Cambio de texto al aire**: la caja no se re-anima; título y subtítulo hacen fundido cruzado
  (`AnimatePresence mode="popLayout"`) y `AutoHeight` anima el alto.
- **Salida en capas**: al salir, el texto pasa a `exit` (sale por su máscara) y la caja espera.
- **Cambio de tema o de tipo** (versículo → canción): sale con el diseño anterior, entra con el nuevo.

### Temas de serie (ej. "Lucas · Octubre")
Basados en el paquete de Canva de cada mes: paleta propia en su `.module.css`, ornamentos en
`Decor` (`themes/types.ts`) y trazos SVG que se dibujan (`components/ornaments/Botanical.tsx`).
Las pantallas de inicio/fin están en `components/screens/`.

### Agregar un tema

1. Agregar el id en `THEME_IDS` (`themes/types.ts`).
2. Crear `presets/<id>.module.css` con las clases `stage, box, panel, logo, accent, content, title, subtitle`
   y sus variantes por tipo con `.stage[data-kind="scripture" | "lyrics" | "info"]`.
3. Usar `var(--accent)` para el color de la iglesia (no `color-mix()`: OBS 30 usa Chromium 103).
4. Definir sus variantes (reutilizando `maskLine`) y registrarlo en `registry.ts`.

## Notas de broadcast

- **`backdrop-filter` no desenfoca el video en OBS**: la Browser Source no "ve" lo que hay debajo.
  Por eso los paneles usan fondos con suficiente opacidad. Para un vidrio real, aplica el blur en
  OBS (duplicar la fuente de video + filtro de desenfoque + máscara).
- **Áreas seguras**: todo el texto queda dentro del *title safe* (90%). Activa las guías con `G`.
- **Densidad tipográfica**: los textos largos (versículos) reducen su tamaño automáticamente.
- **Seguridad**: el texto se renderiza como texto de React (escapado), nunca con `innerHTML`.
